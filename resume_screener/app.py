import csv
import io
from pathlib import Path
from uuid import uuid4

from docx import Document
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware

from .agents.matcher_agent import match_candidate
from .agents.parser_agent import parse_resume
from .agents.bias_agent import check_bias
from .agents.shortlist_agent import make_decision
from .audit import AuditLogger
from .orchestrator import PipelineOrchestrator
from .schemas import ShortlistEntry

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

app = FastAPI(
    title="AI Resume Screener API",
    description="Backend API for React resume screening dashboard",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

orchestrator = PipelineOrchestrator()
audit_logger = AuditLogger()

ALLOWED_EXTENSIONS = {".pdf", ".docx"}


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    try:
        import pdfplumber

        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)
    except Exception:
        pass

    try:
        import fitz

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        return "\n".join(page.get_text() for page in doc)
    except Exception:
        return ""


def extract_text_from_docx(file_bytes: bytes) -> str:
    document = Document(io.BytesIO(file_bytes))
    return "\n".join(paragraph.text for paragraph in document.paragraphs)


def extract_text(file_name: str, file_bytes: bytes) -> str:
    extension = Path(file_name).suffix.lower()
    if extension == ".pdf":
        return extract_text_from_pdf(file_bytes)
    if extension == ".docx":
        return extract_text_from_docx(file_bytes)
    return ""


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "app": "AI Resume Screener API"}


@app.post("/api/jobs", status_code=status.HTTP_201_CREATED)
def create_job(job_id: str = Form(...), jd_text: str = Form(...)) -> dict[str, str]:
    if not jd_text.strip():
        raise HTTPException(status_code=400, detail="Job description must not be empty.")
    audit_logger.create_job(job_id, jd_text)
    return {"job_id": job_id, "status": "created"}


@app.post("/api/upload-resume", status_code=status.HTTP_202_ACCEPTED)
async def upload_resume(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    job_id: str = Form(...),
) -> dict[str, str]:
    extension = Path(file.filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")

    job = audit_logger.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job ID not found.")

    file_bytes = await file.read()
    raw_text = extract_text(file.filename, file_bytes)
    if not raw_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from the uploaded resume.")

    candidate_id = str(uuid4())
    audit_logger.create_candidate(candidate_id, job_id, file.filename, raw_text)
    background_tasks.add_task(orchestrator.run_pipeline, candidate_id)

    return {"candidate_id": candidate_id, "status": "queued"}


@app.get("/api/shortlist/{job_id}", response_model=list[ShortlistEntry])
def get_shortlist(job_id: str) -> list[ShortlistEntry]:
    results = audit_logger.get_results_for_job(job_id)
    if not results:
        raise HTTPException(status_code=404, detail="No results available for this job ID.")
    return [ShortlistEntry.model_validate(item) for item in results]


@app.get("/api/audit/{candidate_id}")
def get_audit_trail(candidate_id: str) -> list[dict]:
    trail = audit_logger.get_full_audit_trail(candidate_id)
    if not trail:
        raise HTTPException(status_code=404, detail="Audit trail not found for candidate.")
    return trail


@app.get("/api/shortlist/{job_id}/csv")
def download_results_csv(job_id: str) -> Response:
    results = audit_logger.get_results_for_job(job_id)
    if not results:
        raise HTTPException(status_code=404, detail="No results available for this job ID.")

    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=["candidate_id", "file_name", "job_id", "match_score", "decision", "reason", "bias_passed", "timestamp"],
    )
    writer.writeheader()
    for row in results:
        writer.writerow(row)

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=screening_results_{job_id}.csv"},
    )
