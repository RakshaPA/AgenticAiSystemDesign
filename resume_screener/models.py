# resume_screener/models.py
from sqlalchemy import Column, String, Integer, Float, JSON, Text, DateTime, Enum, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from db import Base
import enum, datetime
import os

# Try to use pgvector if available (PostgreSQL), otherwise use Text for SQLite
try:
    from pgvector.sqlalchemy import Vector
    VECTOR_AVAILABLE = True
except ImportError:
    VECTOR_AVAILABLE = False
    # Create a mock Vector type for SQLite
    Vector = lambda dim: Text

class DecisionStatus(str, enum.Enum):
    shortlisted = "shortlisted"
    review = "review"
    rejected = "rejected"

class JobDescription(Base):
    __tablename__ = "job_descriptions"
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    required_skills = Column(JSON, default=[])       # ["Python", "FastAPI"]
    preferred_skills = Column(JSON, default=[])      # ["Docker", "Redis"]
    min_experience_years = Column(Float, default=0)
    required_certifications = Column(JSON, default=[])
    embedding = Column(Vector(1536), nullable=True)   # pgvector column
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    resumes = relationship("Resume", back_populates="job")

class Resume(Base):
    __tablename__ = "resumes"
    id = Column(String, primary_key=True)
    job_id = Column(String, ForeignKey("job_descriptions.id"), nullable=False)
    original_filename = Column(String)
    raw_text = Column(Text)                          # original extracted text
    cleaned_text = Column(Text)                      # bias-scrubbed text
    structured_data = Column(JSON)                   # parsed JSON (skills, exp, etc.)
    bias_scrubbed_fields = Column(JSON)              # what was removed + why
    embedding = Column(Vector(1536), nullable=True)  # pgvector column
    vector_similarity_score = Column(Float)          # cosine sim vs JD
    weighted_score = Column(Float)                   # final weighted score
    score_breakdown = Column(JSON)                   # per-metric scores
    decision = Column(Enum(DecisionStatus))
    llm_explanation = Column(Text, nullable=True)    # only for shortlisted/review
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    evaluated_at = Column(DateTime, nullable=True)
    job = relationship("JobDescription", back_populates="resumes")
    audit = relationship("AuditLog", back_populates="resume", uselist=False)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True)
    resume_id = Column(String, ForeignKey("resumes.id"), nullable=False)
    job_id = Column(String)
    decision = Column(Enum(DecisionStatus))
    vector_similarity_score = Column(Float)
    weighted_score = Column(Float)
    score_breakdown = Column(JSON)
    bias_fields_removed = Column(JSON)
    guardrail_violations = Column(JSON, default=[])  # any guardrail that fired
    llm_explanation = Column(Text, nullable=True)
    reviewer_override = Column(Boolean, default=False)
    reviewer_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    resume = relationship("Resume", back_populates="audit")