# resume_screener/agents/explainer.py
"""
LLM Explanation Agent — called ONLY for shortlisted and review candidates.
Rejected candidates below threshold get a template explanation (no LLM cost).
"""
from anthropic import AsyncAnthropic

client = AsyncAnthropic()

EXPLAIN_SYSTEM = """You are a fair and objective hiring assistant generating explanations 
for resume screening decisions. You ONLY have access to professional data (no names, gender, 
location, or personal information).

Your explanation must:
1. Reference specific skills, experience, and projects
2. Be factual and tied to job requirements  
3. Never reference any personal attributes
4. Be 3-5 sentences, clear enough for a recruiter to understand

Format: Start with the decision ("Shortlisted", "Recommended for Review", or "Not Selected"),
then explain the key factors."""

async def generate_explanation(
    decision: str,
    score_breakdown: dict,
    structured_data: dict,
    jd: dict,
) -> str:
    """Generate human-readable explanation for shortlisted/review candidates."""
    
    # Rejected candidates: use deterministic template (save LLM cost)
    if decision == "rejected":
        score = score_breakdown.get("weighted_total", 0)
        req_score = score_breakdown.get("required_skills_score", 0)
        return (
            f"Not Selected. Weighted score: {score:.1f}/100 (threshold: 72). "
            f"Required skills match: {req_score:.1f}%. "
            f"Key gaps: insufficient alignment with required technical competencies for this role."
        )

    context = f"""
Decision: {decision.upper()}
Job Title: {jd.get('title', 'N/A')}
Required Skills: {', '.join(jd.get('required_skills', []))}
Preferred Skills: {', '.join(jd.get('preferred_skills', []))}

Candidate Profile (anonymized):
- Skills: {', '.join(structured_data.get('skills', [])[:15])}
- Experience: {structured_data.get('experience_years', 0)} years
- Certifications: {', '.join(structured_data.get('certifications', []))}
- Projects: {len(structured_data.get('projects', []))} documented

Score Breakdown:
- Required Skills Match: {score_breakdown.get('required_skills_score', 0):.1f}%
- Preferred Skills Match: {score_breakdown.get('preferred_skills_score', 0):.1f}%
- Experience Score: {score_breakdown.get('experience_score', 0):.1f}%
- Project Relevance: {score_breakdown.get('project_relevance_score', 0):.1f}%
- Certification Score: {score_breakdown.get('certification_score', 0):.1f}%
- Final Weighted Score: {score_breakdown.get('weighted_total', 0):.1f}/100

Generate a recruiter-facing explanation for this decision."""

    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=300,
        system=EXPLAIN_SYSTEM,
        messages=[{"role": "user", "content": context}]
    )
    return response.content[0].text.strip()