# resume_screener/app.py
import uuid
import io
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import pdfplumber  # or use your existing text extractor

from db import get_db, engine, Base
from models import Resume, JobDescription, AuditLog, DecisionStatus
from schemas import (JobDescriptionCreate, JobDescriptionOut,
                     ResumeEvaluationOut, AuditLogOut, ReviewerDecision)
from orchestrator import run_screening_pipeline
from agents.embedder import get_embedding
import models

class LoginPayload(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str

USERS = {
    'admin@recruitiq.com': {
        'id': '1', 'email': 'admin@recruitiq.com', 'name': 'Admin User',
        'role': 'admin', 'password': 'password123', 'access_token': 'admin-token', 'refresh_token': 'admin-refresh'
    },
    'recruiter@recruitiq.com': {
        'id': '2', 'email': 'recruiter@recruitiq.com', 'name': 'Recruiter User',
        'role': 'recruiter', 'password': 'password123', 'access_token': 'recruiter-token', 'refresh_token': 'recruiter-refresh'
    },
    'manager@recruitiq.com': {
        'id': '3', 'email': 'manager@recruitiq.com', 'name': 'Hiring Manager',
        'role': 'hiring_manager', 'password': 'password123', 'access_token': 'manager-token', 'refresh_token': 'manager-refresh'
    },
    'auditor@recruitiq.com': {
        'id': '4', 'email': 'auditor@recruitiq.com', 'name': 'Auditor User',
        'role': 'auditor', 'password': 'password123', 'access_token': 'auditor-token', 'refresh_token': 'auditor-refresh'
    },
}

app = FastAPI(title="Resume Screener API v2")
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Resume Screener API v2",
        "docs": "Visit http://127.0.0.1:8000/docs for interactive documentation",
        "endpoints": {
            "POST /jobs": "Create a new job description",
            "GET /jobs/{job_id}": "Get a job description",
            "POST /resumes/evaluate": "Evaluate resumes against a job",
            "GET /audit/{resume_id}": "Get audit log for a resume"
        }
    }

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Add mock jobs for testing
    async with AsyncSession(engine) as db:
        from sqlalchemy import select
        existing = await db.execute(select(JobDescription).limit(1))
        if not existing.scalars().first():
            mock_jobs = [
                JobDescription(
                    id='1',
                    title='Senior Backend Engineer',
                    description='Build scalable APIs with Python and FastAPI for our AI platform.',
                    required_skills=['Python', 'FastAPI', 'PostgreSQL', 'Docker', 'Redis'],
                    preferred_skills=['LangChain', 'pgvector', 'Kubernetes'],
                    min_experience_years=4,
                    required_certifications=[],
                    embedding=None,
                ),
                JobDescription(
                    id='2',
                    title='ML Engineer',
                    description='Design and deploy production-grade ML models and embedding pipelines.',
                    required_skills=['Python', 'PyTorch', 'scikit-learn', 'MLflow'],
                    preferred_skills=['LangChain', 'FAISS', 'Triton'],
                    min_experience_years=3,
                    required_certifications=['AWS ML Specialty'],
                    embedding=None,
                ),
                JobDescription(
                    id='3',
                    title='Frontend Engineer',
                    description='Build enterprise-grade React applications with TypeScript and Tailwind.',
                    required_skills=['React', 'TypeScript', 'TailwindCSS', 'Zustand'],
                    preferred_skills=['Framer Motion', 'Recharts', 'Vite'],
                    min_experience_years=2,
                    required_certifications=[],
                    embedding=None,
                ),
            ]
            for job in mock_jobs:
                db.add(job)
            await db.commit()

# ── Auth Endpoints ─────────────────────────────────────────────────────────────

@app.post("/auth/login")
async def login(payload: LoginPayload):
    user = USERS.get(payload.email)
    if not user or payload.password != user['password']:
        raise HTTPException(status_code=401, detail='Invalid email or password')

    return {
        'access_token': user['access_token'],
        'refresh_token': user['refresh_token'],
        'token_type': 'Bearer',
    }

@app.get("/auth/me", response_model=UserOut)
async def me(authorization: str | None = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Missing authorization header')

    token = authorization.split(' ', 1)[1]
    for user in USERS.values():
        if user['access_token'] == token:
            return {
                'id': user['id'],
                'email': user['email'],
                'name': user['name'],
                'role': user['role'],
            }

    raise HTTPException(status_code=401, detail='Invalid token')

# ── Job Description Endpoints ─────────────────────────────────────────────────

@app.get("/jobs", response_model=list[JobDescriptionOut])
async def list_jobs(db: AsyncSession = Depends(get_db)):
    """List all job descriptions."""
    from sqlalchemy import select
    result = await db.execute(select(JobDescription).order_by(JobDescription.created_at.desc()))
    return result.scalars().all()

@app.post("/jobs", response_model=JobDescriptionOut)
async def create_job(payload: JobDescriptionCreate, db: AsyncSession = Depends(get_db)):
    """Create JD and pre-compute its embedding for vector matching."""
    jd_text = f"{payload.title}\n{payload.description}\nRequired: {', '.join(payload.required_skills)}"
    embedding = await get_embedding(jd_text)
    
    jd = JobDescription(
        id=str(uuid.uuid4()),
        **payload.dict(),
        embedding=embedding
    )
    db.add(jd)
    await db.commit()
    await db.refresh(jd)
    return jd

@app.get("/jobs/{job_id}", response_model=JobDescriptionOut)
async def get_job(job_id: str, db: AsyncSession = Depends(get_db)):
    jd = await db.get(JobDescription, job_id)
    if not jd:
        raise HTTPException(404, "Job not found")
    return jd

@app.delete("/jobs/{job_id}", status_code=204)
async def delete_job(job_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a job description."""
    jd = await db.get(JobDescription, job_id)
    if not jd:
        raise HTTPException(404, "Job not found")
    await db.delete(jd)
    await db.commit()

# ── Resume Upload + Evaluate ──────────────────────────────────────────────────

@app.post("/jobs/{job_id}/resumes", response_model=ResumeEvaluationOut)
async def upload_and_evaluate_resume(
    job_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Single resume upload + full pipeline evaluation.
    For bulk: use /jobs/{job_id}/resumes/bulk
    """
    jd = await db.get(JobDescription, job_id)
    if not jd:
        raise HTTPException(404, "Job not found")
    
    # Extract text from PDF/DOCX
    content = await file.read()
    raw_text = extract_text(content, file.filename)
    
    resume_id = str(uuid.uuid4())
    
    # Save initial resume record
    resume = Resume(
        id=resume_id, job_id=job_id,
        original_filename=file.filename,
        raw_text=raw_text
    )
    db.add(resume)
    await db.commit()
    
    # Return mock evaluation (to bypass Anthropic API key requirement during dev)
    return ResumeEvaluationOut(
        resume_id=resume_id,
        job_id=job_id,
        vector_similarity_score=0.75,
        score_breakdown={
            'required_skills_score': 78,
            'preferred_skills_score': 65,
            'experience_score': 82,
            'project_relevance_score': 70,
            'certification_score': 60,
            'weighted_total': 74,
        },
        weighted_score=74.0,
        decision='shortlisted',
        llm_explanation='Resume shows strong technical skills and relevant experience.',
        bias_fields_removed=['email', 'phone', 'address'],
        guardrail_violations=[]
    )

# ── Audit & Review Endpoints ──────────────────────────────────────────────────

@app.get("/jobs/{job_id}/shortlist", response_model=list[AuditLogOut])
async def get_shortlist(job_id: str, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.job_id == job_id, AuditLog.decision == DecisionStatus.shortlisted)
        .order_by(AuditLog.created_at.desc())
    )
    return result.scalars().all()

@app.get("/jobs/{job_id}/review-queue", response_model=list[AuditLogOut])
async def get_review_queue(job_id: str, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.job_id == job_id, AuditLog.decision == DecisionStatus.review)
        .order_by(AuditLog.created_at.desc())
    )
    return result.scalars().all()

@app.patch("/resumes/{resume_id}/review", response_model=AuditLogOut)
async def submit_reviewer_decision(
    resume_id: str,
    payload: ReviewerDecision,
    db: AsyncSession = Depends(get_db)
):
    """HR reviewer can override borderline decisions with notes."""
    from sqlalchemy import select, update
    audit = await db.execute(
        select(AuditLog).where(AuditLog.resume_id == resume_id)
    )
    audit = audit.scalar_one_or_none()
    if not audit:
        raise HTTPException(404, "Audit log not found")
    
    audit.decision = payload.decision
    audit.reviewer_override = True
    audit.reviewer_notes = payload.notes
    await db.commit()
    await db.refresh(audit)
    return audit

@app.get("/audit/{resume_id}", response_model=AuditLogOut)
async def get_audit_log(resume_id: str, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    result = await db.execute(
        select(AuditLog).where(AuditLog.resume_id == resume_id)
    )
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(404, "Audit log not found")
    return log

# ── Analytics Endpoints ───────────────────────────────────────────────────────

@app.get("/analytics/dashboard")
async def analytics_dashboard(job_id: str | None = None):
    """Mock analytics dashboard data."""
    # Return keys expected by the frontend DashboardPage
    return {
        "total_applications": 125,
        "shortlisted": 32,
        "in_review": 15,
        "rejected": 78,
        "avg_match_score": 68.5,
        "shortlist_rate": 25.6,
    }

@app.get("/analytics/trends")
async def analytics_trends(days: int = 30):
    """Mock trends data."""
    # Frontend expects objects with date, applications, shortlisted
    return [
        {"date": f"2025-05-{i:02d}", "applications": 40 + (i % 80), "shortlisted": 5 + (i % 6)}
        for i in range(1, min(days, 30) + 1)
    ]

@app.get("/analytics/skills")
async def analytics_skills(job_id: str | None = None):
    """Mock skill distribution data."""
    # Return an array (frontend expects a list)
    return [
        {"skill": "Python", "count": 342, "avg_score": 75},
        {"skill": "React", "count": 289, "avg_score": 71},
        {"skill": "FastAPI", "count": 198, "avg_score": 72},
        {"skill": "PostgreSQL", "count": 176, "avg_score": 70},
        {"skill": "Docker", "count": 154, "avg_score": 68},
        {"skill": "TypeScript", "count": 143, "avg_score": 69},
    ]

@app.get("/analytics/fairness")
async def analytics_fairness():
    """Mock fairness metrics."""
    return {
        "gender_parity": 0.94,
        "age_bias_score": 0.89,
        "location_bias_score": 0.91,
        "overall_fairness": 0.92,
        "fields_removed": ["email", "phone", "address", "date_of_birth"],
    }

# ── Helper ────────────────────────────────────────────────────────────────────
def extract_text(content: bytes, filename: str) -> str:
    """Extract raw text from PDF or DOCX."""
    if filename.endswith(".pdf"):
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            return "\n".join(p.extract_text() or "" for p in pdf.pages)
    elif filename.endswith(".docx"):
        import docx
        doc = docx.Document(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs)
    return content.decode("utf-8", errors="ignore")