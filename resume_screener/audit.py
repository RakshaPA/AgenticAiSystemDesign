import json
from uuid import uuid4
from typing import Optional

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from .db import Base, SessionLocal, engine
from .models import AuditEvent, Candidate, Decision, JobDescription
from .schemas import AuditRecord, ShortlistEntry


class AuditLogger:
    def __init__(self):
        Base.metadata.create_all(engine)

    def create_job(self, job_id: str, jd_text: str) -> JobDescription:
        with SessionLocal() as session:
            job = session.get(JobDescription, job_id)
            if job:
                job.jd_text = jd_text
            else:
                job = JobDescription(job_id=job_id, jd_text=jd_text)
                session.add(job)
            session.commit()
            return job

    def create_candidate(self, candidate_id: str, job_id: str, file_name: str, raw_text: str) -> Candidate:
        with SessionLocal() as session:
            candidate = Candidate(
                candidate_id=candidate_id,
                job_id=job_id,
                file_name=file_name,
                raw_text=raw_text,
                status="queued",
            )
            session.add(candidate)
            session.commit()
            return candidate

    def get_job(self, job_id: str) -> Optional[JobDescription]:
        with SessionLocal() as session:
            return session.get(JobDescription, job_id)

    def get_candidate(self, candidate_id: str) -> Optional[Candidate]:
        with SessionLocal() as session:
            return session.get(Candidate, candidate_id)

    def update_candidate_profile(self, candidate_id: str, parsed_profile: dict, status: str) -> None:
        with SessionLocal() as session:
            candidate = session.get(Candidate, candidate_id)
            if not candidate:
                return
            candidate.parsed_profile = parsed_profile
            candidate.status = status
            session.commit()

    def log_stage(self, record: AuditRecord) -> None:
        try:
            with SessionLocal() as session:
                event = AuditEvent(
                    id=record.log_id,
                    candidate_id=record.candidate_id,
                    job_id=record.job_id,
                    stage=record.stage,
                    decision=record.decision,
                    details=json.loads(record.details) if record.details else {},
                    timestamp=record.timestamp,
                )
                session.add(event)
                session.commit()
        except SQLAlchemyError as exc:
            raise RuntimeError(f"Failed to log audit stage: {exc}") from exc

    def log_final_decision(self, entry: ShortlistEntry) -> None:
        try:
            with SessionLocal() as session:
                decision = Decision(
                    candidate_id=entry.candidate_id,
                    file_name=entry.file_name,
                    job_id=entry.job_id,
                    match_score=entry.match_score,
                    decision=entry.decision,
                    reason=entry.reason,
                    bias_passed=entry.bias_passed,
                    timestamp=entry.timestamp,
                )
                session.merge(decision)
                session.commit()
        except SQLAlchemyError as exc:
            raise RuntimeError(f"Failed to log final decision: {exc}") from exc

    def get_results_for_job(self, job_id: str) -> list[dict]:
        with SessionLocal() as session:
            stmt = select(Decision).where(Decision.job_id == job_id)
            rows = session.scalars(stmt).all()
            return [
                {
                    "candidate_id": row.candidate_id,
                    "file_name": row.file_name,
                    "job_id": row.job_id,
                    "match_score": row.match_score,
                    "decision": row.decision,
                    "reason": row.reason,
                    "bias_passed": row.bias_passed,
                    "timestamp": row.timestamp.isoformat(),
                }
                for row in rows
            ]

    def get_full_audit_trail(self, candidate_id: str) -> list[dict]:
        with SessionLocal() as session:
            stmt = select(AuditEvent).where(AuditEvent.candidate_id == candidate_id).order_by(AuditEvent.timestamp)
            rows = session.scalars(stmt).all()
            return [
                {
                    "stage": row.stage,
                    "decision": row.decision,
                    "timestamp": row.timestamp.isoformat(),
                    "details": json.dumps(row.details),
                }
                for row in rows
            ]
