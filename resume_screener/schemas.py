from pydantic import BaseModel


class RawResume(BaseModel):
    candidate_id: str
    raw_text: str
    file_name: str


class ParsedCandidate(BaseModel):
    candidate_id: str
    skills: list[str]
    experience_years: float
    education: str
    certifications: list[str]
    has_work_gaps: bool


class MatchResult(BaseModel):
    candidate_id: str
    job_id: str
    match_score: float
    matched_skills: list[str]
    missing_skills: list[str]
    score_rationale: str


class BiasCheckResult(BaseModel):
    candidate_id: str
    passed: bool
    pii_found: list[str]
    bias_flags: list[str]
    requires_human_review: bool


class ShortlistEntry(BaseModel):
    candidate_id: str
    file_name: str
    job_id: str
    match_score: float
    decision: str
    reason: str
    bias_passed: bool
    timestamp: str


class AuditRecord(BaseModel):
    log_id: str
    candidate_id: str
    job_id: str
    stage: str
    decision: str
    details: str
    timestamp: str
