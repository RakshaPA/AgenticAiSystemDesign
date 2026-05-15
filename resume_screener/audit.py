# resume_screener/audit.py
"""
Audit Logger — every decision is logged with full traceability.
No decision is made without an audit entry.
"""
import uuid
import datetime
from db import AsyncSessionLocal
from models import AuditLog
from sqlalchemy import update
from models import Resume

async def write_audit_log(state: dict):
    """Write complete audit record for every screening decision."""
    async with AsyncSessionLocal() as session:
        log = AuditLog(
            id=str(uuid.uuid4()),
            resume_id=state["resume_id"],
            job_id=state["job_id"],
            decision=state["decision"],
            vector_similarity_score=state.get("vector_similarity", 0),
            weighted_score=state["score_result"]["weighted_score"],
            score_breakdown=state["score_result"]["score_breakdown"],
            bias_fields_removed=state.get("bias_fields_removed", []),
            guardrail_violations=state.get("guardrail_violations", []),
            llm_explanation=state.get("llm_explanation"),
            reviewer_override=False,
            created_at=datetime.datetime.utcnow()
        )
        session.add(log)
        
        # Update resume record with final evaluation results
        await session.execute(
            update(Resume)
            .where(Resume.id == state["resume_id"])
            .values(
                cleaned_text=state["cleaned_text"],
                structured_data=state["structured_data"],
                bias_scrubbed_fields=state["bias_fields_removed"],
                vector_similarity_score=state.get("vector_similarity"),
                weighted_score=state["score_result"]["weighted_score"],
                score_breakdown=state["score_result"]["score_breakdown"],
                decision=state["decision"],
                llm_explanation=state.get("llm_explanation"),
                evaluated_at=datetime.datetime.utcnow()
            )
        )
        await session.commit()