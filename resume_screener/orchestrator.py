import io
import json
from uuid import uuid4
from datetime import datetime
from typing import Optional

from .db import SessionLocal
from .models import Candidate, JobDescription
from .schemas import RawResume, ShortlistEntry, AuditRecord
from .guardrails import GuardrailEnforcer
from .audit import AuditLogger
from .agents.parser_agent import parse_resume
from .agents.matcher_agent import match_candidate
from .agents.bias_agent import check_bias
from .agents.shortlist_agent import make_decision


class PipelineOrchestrator:

    def __init__(self):
        self.guardrails = GuardrailEnforcer()
        self.logger = AuditLogger()

    def _load_candidate(self, candidate_id: str) -> Optional[Candidate]:
        with SessionLocal() as session:
            return session.get(Candidate, candidate_id)

    def _load_job(self, job_id: str) -> Optional[JobDescription]:
        with SessionLocal() as session:
            return session.get(JobDescription, job_id)

    def run_pipeline(self, candidate_id: str) -> None:
        candidate = self._load_candidate(candidate_id)
        if candidate is None:
            return

        job = self._load_job(candidate.job_id)
        if job is None:
            return

        stages_completed: list[str] = []
        try:
            raw = RawResume(candidate_id=candidate.candidate_id, raw_text=candidate.raw_text, file_name=candidate.file_name)

            parsed = parse_resume(raw)
            self.logger.update_candidate_profile(candidate_id, parsed.model_dump(), status="processing")
            violations = self.guardrails.validate_parsed_candidate(parsed)
            self.logger.log_stage(AuditRecord(
                log_id=str(uuid4()),
                candidate_id=candidate.candidate_id,
                job_id=candidate.job_id,
                stage="parsing",
                decision="ok" if not violations else "violation",
                details=json.dumps(parsed.model_dump()),
                timestamp=datetime.now().isoformat(),
            ))
            stages_completed.append("parsing")

            match_result = match_candidate(parsed, job.jd_text, candidate.job_id)
            self.logger.log_stage(AuditRecord(
                log_id=str(uuid4()),
                candidate_id=candidate.candidate_id,
                job_id=candidate.job_id,
                stage="matching",
                decision=f"score:{match_result.match_score:.1f}",
                details=json.dumps(match_result.model_dump()),
                timestamp=datetime.now().isoformat(),
            ))
            stages_completed.append("matching")

            bias_result = check_bias(parsed, candidate.raw_text)
            self.logger.log_stage(AuditRecord(
                log_id=str(uuid4()),
                candidate_id=candidate.candidate_id,
                job_id=candidate.job_id,
                stage="bias_check",
                decision="passed" if bias_result.passed else "flagged",
                details=json.dumps(bias_result.model_dump()),
                timestamp=datetime.now().isoformat(),
            ))
            stages_completed.append("bias_check")

            if not self.guardrails.check_pipeline_integrity(stages_completed):
                raise RuntimeError("Pipeline integrity violation: bias check missing")

            entry = make_decision(match_result, bias_result, candidate.file_name)
            self.logger.log_stage(AuditRecord(
                log_id=str(uuid4()),
                candidate_id=candidate.candidate_id,
                job_id=candidate.job_id,
                stage="shortlisting",
                decision=entry.decision,
                details=json.dumps(entry.model_dump()),
                timestamp=datetime.now().isoformat(),
            ))
            self.logger.log_final_decision(entry)
            self.logger.update_candidate_profile(candidate_id, parsed.model_dump(), status="completed")

        except Exception as exc:
            self.logger.update_candidate_profile(candidate_id, {}, status="failed")
            fallback = ShortlistEntry(
                candidate_id=candidate.candidate_id,
                file_name=candidate.file_name,
                job_id=candidate.job_id,
                match_score=0.0,
                decision="manual_review",
                reason=f"Pipeline error — manual review required. Error: {str(exc)[:100]}",
                bias_passed=False,
                timestamp=datetime.now().isoformat(),
            )
            self.logger.log_stage(AuditRecord(
                log_id=str(uuid4()),
                candidate_id=candidate.candidate_id,
                job_id=candidate.job_id,
                stage="shortlisting",
                decision="manual_review",
                details=json.dumps(fallback.model_dump()),
                timestamp=datetime.now().isoformat(),
            ))
            self.logger.log_final_decision(fallback)
