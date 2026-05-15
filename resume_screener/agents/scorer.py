# resume_screener/agents/scorer.py
"""
Weighted Scoring Agent
No LLM involved — pure deterministic scoring for speed and auditability.

Weights (must sum to 1.0):
  required_skills   → 0.35
  preferred_skills  → 0.20
  experience        → 0.25
  project_relevance → 0.12
  certifications    → 0.08
"""
from schemas import ScoreBreakdown

WEIGHTS = {
    "required_skills": 0.35,
    "preferred_skills": 0.20,
    "experience": 0.25,
    "project_relevance": 0.12,
    "certifications": 0.08,
}

# Decision thresholds
SHORTLIST_THRESHOLD = 72.0   # >= 72 → shortlisted
REVIEW_THRESHOLD = 50.0      # 50-71 → manual review
# < 50 → rejected

def score_required_skills(resume_skills: list, required: list) -> float:
    """What % of required skills does the candidate have?"""
    if not required:
        return 100.0
    resume_lower = [s.lower() for s in resume_skills]
    matched = sum(1 for skill in required if skill.lower() in resume_lower)
    return round((matched / len(required)) * 100, 2)

def score_preferred_skills(resume_skills: list, preferred: list) -> float:
    if not preferred:
        return 100.0
    resume_lower = [s.lower() for s in resume_skills]
    matched = sum(1 for skill in preferred if skill.lower() in resume_lower)
    return round((matched / len(preferred)) * 100, 2)

def score_experience(candidate_years: float, required_years: float) -> float:
    """
    Full score if meets requirement.
    Partial score if within 1 year below.
    Zero if > 2 years below.
    Cap bonus at 20 points for overqualification signal.
    """
    if required_years == 0:
        return 100.0
    if candidate_years >= required_years:
        bonus = min((candidate_years - required_years) * 5, 20)
        return min(100.0, 80.0 + bonus)
    gap = required_years - candidate_years
    if gap <= 1:
        return round(60 - (gap * 20), 2)
    return max(0.0, round(40 - (gap * 10), 2))

def score_projects(projects: list, required_skills: list) -> float:
    """Check how many projects use required tech stack."""
    if not projects or not required_skills:
        return 50.0  # neutral if no data
    req_lower = [s.lower() for s in required_skills]
    relevant = 0
    for proj in projects:
        tech = [t.lower() for t in proj.get("tech_stack", [])]
        if any(r in tech for r in req_lower):
            relevant += 1
    return round(min(100.0, (relevant / max(len(projects), 1)) * 100), 2)

def score_certifications(candidate_certs: list, required_certs: list) -> float:
    if not required_certs:
        return 100.0
    cand_lower = [c.lower() for c in candidate_certs]
    matched = sum(1 for cert in required_certs if cert.lower() in cand_lower)
    return round((matched / len(required_certs)) * 100, 2)

def compute_weighted_score(breakdown: dict) -> float:
    total = (
        breakdown["required_skills_score"] * WEIGHTS["required_skills"] +
        breakdown["preferred_skills_score"] * WEIGHTS["preferred_skills"] +
        breakdown["experience_score"] * WEIGHTS["experience"] +
        breakdown["project_relevance_score"] * WEIGHTS["project_relevance"] +
        breakdown["certification_score"] * WEIGHTS["certifications"]
    )
    return round(total, 2)

def decide_status(weighted_score: float, vector_sim: float) -> str:
    """
    GUARDRAIL: Cannot shortlist below SHORTLIST_THRESHOLD.
    Vector sim < 0.3 forces rejection even if score is borderline.
    """
    if vector_sim < 0.30:
        return "rejected"
    if weighted_score >= SHORTLIST_THRESHOLD:
        return "shortlisted"
    elif weighted_score >= REVIEW_THRESHOLD:
        return "review"
    return "rejected"

def run_scorer(structured_data: dict, jd: dict, vector_sim: float) -> dict:
    """
    Main entry — returns full scoring result dict.
    structured_data: output of parser agent
    jd: job description dict with required_skills, preferred_skills, etc.
    """
    breakdown = {
        "required_skills_score": score_required_skills(
            structured_data.get("skills", []), jd.get("required_skills", [])),
        "preferred_skills_score": score_preferred_skills(
            structured_data.get("skills", []), jd.get("preferred_skills", [])),
        "experience_score": score_experience(
            structured_data.get("experience_years", 0), jd.get("min_experience_years", 0)),
        "project_relevance_score": score_projects(
            structured_data.get("projects", []), jd.get("required_skills", [])),
        "certification_score": score_certifications(
            structured_data.get("certifications", []), jd.get("required_certifications", [])),
    }
    weighted = compute_weighted_score(breakdown)
    breakdown["weighted_total"] = weighted
    
    decision = decide_status(weighted, vector_sim)
    
    return {
        "score_breakdown": breakdown,
        "weighted_score": weighted,
        "decision": decision,
        "passed_vector_filter": vector_sim >= 0.30,
    }