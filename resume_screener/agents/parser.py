# resume_screener/agents/parser.py
"""
Resume Parsing Agent
Input: bias-scrubbed resume text
Output: structured JSON with skills, experience, projects, certifications
"""
import json
from anthropic import AsyncAnthropic

client = AsyncAnthropic()

PARSE_SYSTEM_PROMPT = """You are a resume parsing agent. You receive bias-scrubbed resume text 
(all PII removed). Extract ONLY professional information. 

Return a valid JSON object with this exact structure:
{
  "skills": ["skill1", "skill2"],
  "experience_years": 3.5,
  "experience_entries": [
    {"role": "...", "company": "[COMPANY]", "duration_months": 12, "description": "..."}
  ],
  "projects": [
    {"name": "...", "tech_stack": ["..."], "description": "..."}
  ],
  "certifications": ["AWS Certified Developer", "..."],
  "education": [
    {"degree": "...", "field": "...", "institution": "[INSTITUTION]"}
  ],
  "summary": "professional summary if present"
}

CRITICAL: Do NOT infer or hallucinate any fields. Return empty arrays if information is absent.
Return ONLY the JSON object, no preamble or markdown."""

async def parse_resume(cleaned_text: str) -> dict:
    """Parse bias-scrubbed resume text into structured JSON."""
    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1500,
        system=PARSE_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": f"Parse this resume:\n\n{cleaned_text}"}]
    )
    
    raw = response.content[0].text.strip()
    # Strip markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Fallback: return minimal structure
        return {
            "skills": [], "experience_years": 0, "experience_entries": [],
            "projects": [], "certifications": [], "education": [], "summary": ""
        }