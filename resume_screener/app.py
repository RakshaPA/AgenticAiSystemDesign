# resume_screener/app.py
import uuid
import io
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
import pdfplumber  # or use your existing text extractor

from db import get_db, engine, Base
from models import Resume, JobDescription, AuditLog, DecisionStatus
from schemas import (JobDescriptionCreate, JobDescriptionOut,
                     ResumeEvaluationOut, AuditLogOut, ReviewerDecision)
from orchestrator import run_screening_pipeline
from agents.embedder import get_embedding
import models

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

# ── Job Description Endpoints ─────────────────────────────────────────────────

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
    
    # Run full pipeline
    jd_dict = {
        "id": jd.id, "title": jd.title,
        "required_skills": jd.required_skills,
        "preferred_skills": jd.preferred_skills,
        "min_experience_years": jd.min_experience_years,
        "required_certifications": jd.required_certifications,
        "embedding": jd.embedding,
    }
    
    result = await run_screening_pipeline(resume_id, job_id, raw_text, jd_dict)
    
    return ResumeEvaluationOut(
        resume_id=resume_id,
        job_id=job_id,
        vector_similarity_score=result["vector_similarity"],
        score_breakdown=result["score_result"]["score_breakdown"],
        weighted_score=result["score_result"]["weighted_score"],
        decision=result["decision"],
        llm_explanation=result.get("llm_explanation"),
        bias_fields_removed=result["bias_fields_removed"],
        guardrail_violations=result.get("guardrail_violations", [])
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