from datetime import datetime
from sqlalchemy import Column, DateTime, Float, ForeignKey, JSON, String, Text, Boolean
from sqlalchemy.orm import relationship

from .db import Base


class JobDescription(Base):
    __tablename__ = "job_descriptions"

    job_id = Column(String, primary_key=True, index=True)
    jd_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Candidate(Base):
    __tablename__ = "candidates"

    candidate_id = Column(String, primary_key=True, index=True)
    job_id = Column(String, ForeignKey("job_descriptions.job_id"), nullable=False)
    file_name = Column(String, nullable=False)
    raw_text = Column(Text, nullable=False)
    parsed_profile = Column(JSON, nullable=True)
    status = Column(String, nullable=False, default="queued")
    created_at = Column(DateTime, default=datetime.utcnow)

    audit_events = relationship("AuditEvent", back_populates="candidate")
    decision = relationship("Decision", back_populates="candidate", uselist=False)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String, primary_key=True, index=True)
    candidate_id = Column(String, ForeignKey("candidates.candidate_id"), nullable=False)
    job_id = Column(String, nullable=False)
    stage = Column(String, nullable=False)
    decision = Column(String, nullable=False)
    details = Column(JSON, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="audit_events")


class Decision(Base):
    __tablename__ = "pipeline_decisions"

    candidate_id = Column(String, ForeignKey("candidates.candidate_id"), primary_key=True, index=True)
    file_name = Column(String, nullable=False)
    job_id = Column(String, nullable=False)
    match_score = Column(Float, nullable=False)
    decision = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    bias_passed = Column(Boolean, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="decision")
