# resume_screener/schemas.py
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum

class DecisionStatus(str, Enum):
    shortlisted = "shortlisted"
    review = "review"
    rejected = "rejected"

class JobDescriptionCreate(BaseModel):
    title: str
    description: str
    required_skills: List[str] = []
    preferred_skills: List[str] = []
    min_experience_years: float = 0
    required_certifications: List[str] = []

class JobDescriptionOut(JobDescriptionCreate):
    id: str
    class Config:
        from_attributes = True

class ScoreBreakdown(BaseModel):
    required_skills_score: float      # 0-100
    preferred_skills_score: float     # 0-100
    experience_score: float           # 0-100
    project_relevance_score: float    # 0-100
    certification_score: float        # 0-100
    weighted_total: float             # final weighted score

class ResumeEvaluationOut(BaseModel):
    resume_id: str
    job_id: str
    vector_similarity_score: float
    score_breakdown: ScoreBreakdown
    weighted_score: float
    decision: DecisionStatus
    llm_explanation: Optional[str]
    bias_fields_removed: List[str]
    guardrail_violations: List[str] = []

class AuditLogOut(BaseModel):
    id: str
    resume_id: str
    job_id: str
    decision: DecisionStatus
    vector_similarity_score: float
    weighted_score: float
    score_breakdown: Dict[str, Any]
    bias_fields_removed: List[str]
    guardrail_violations: List[str]
    llm_explanation: Optional[str]
    reviewer_override: bool
    reviewer_notes: Optional[str]
    class Config:
        from_attributes = True

class ReviewerDecision(BaseModel):
    decision: DecisionStatus
    notes: Optional[str] = None