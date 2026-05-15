import json
from typing import Any
import openai
from .schemas import RawResume, ParsedCandidate

SYSTEM_PROMPT = """
You are a resume parser. Extract structured information from the resume text.
Return ONLY valid JSON with exactly these keys:
  "skills": [list of technical and soft skills],
  "experience_years": float (total years of work experience, 0 if fresher),
  "education": "highest degree, e.g. B.Tech Computer Science",
  "certifications": [list, empty if none],
  "has_work_gaps": boolean (true if resume shows unexplained gaps > 6 months)

CRITICAL RULES:
- Do NOT include the candidate's name, email, phone, location, age, or gender
- Do NOT infer gender from name or writing style
- Return ONLY the JSON object, no markdown, no explanation
"""

SIMPLE_PROMPT = """
You are a resume parser. Extract ONLY JSON with keys:
  "skills": [list of technical and soft skills],
  "experience_years": float
Return only a JSON object.
"""


def _extract_json_from_response(response_text: str) -> Any:
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        cleaned = response_text.strip()
        if cleaned.startswith("```") and cleaned.endswith("```"):
            cleaned = cleaned.strip("`\n ")
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            raise


def _normalize_candidate(candidate_id: str, raw_json: dict[str, Any]) -> ParsedCandidate:
    skills = raw_json.get("skills") or []
    if not isinstance(skills, list):
        skills = [str(skills)] if skills else []
    skills = [str(item).strip() for item in skills if str(item).strip()]

    experience_years = raw_json.get("experience_years")
    try:
        experience_years = float(experience_years)
    except (TypeError, ValueError):
        experience_years = 0.0

    education = raw_json.get("education") or ""
    certifications = raw_json.get("certifications") or []
    if not isinstance(certifications, list):
        certifications = [str(certifications)] if certifications else []
    certifications = [str(item).strip() for item in certifications if str(item).strip()]

    has_work_gaps = raw_json.get("has_work_gaps")
    if isinstance(has_work_gaps, str):
        has_work_gaps = has_work_gaps.lower() in {"true", "yes", "1"}
    else:
        has_work_gaps = bool(has_work_gaps)

    return ParsedCandidate(
        candidate_id=candidate_id,
        skills=skills,
        experience_years=experience_years,
        education=str(education).strip(),
        certifications=certifications,
        has_work_gaps=has_work_gaps,
    )


def parse_resume(raw: RawResume) -> ParsedCandidate:
    if not raw.raw_text or not raw.raw_text.strip():
        return ParsedCandidate(
            candidate_id=raw.candidate_id,
            skills=[],
            experience_years=0.0,
            education="",
            certifications=[],
            has_work_gaps=False,
        )

    try:
        completion = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": raw.raw_text},
            ],
            temperature=0.0,
            max_tokens=512,
        )
        response_text = completion.choices[0].message.content
        parsed = _extract_json_from_response(response_text)
        return _normalize_candidate(raw.candidate_id, parsed)
    except Exception:
        try:
            completion = openai.ChatCompletion.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": SIMPLE_PROMPT},
                    {"role": "user", "content": raw.raw_text},
                ],
                temperature=0.0,
                max_tokens=256,
            )
            response_text = completion.choices[0].message.content
            parsed = _extract_json_from_response(response_text)
            normalized = _normalize_candidate(raw.candidate_id, parsed)
            return ParsedCandidate(
                candidate_id=normalized.candidate_id,
                skills=normalized.skills,
                experience_years=normalized.experience_years,
                education="",
                certifications=[],
                has_work_gaps=False,
            )
        except Exception:
            return ParsedCandidate(
                candidate_id=raw.candidate_id,
                skills=["non-english-resume"] if any(ord(ch) > 127 for ch in raw.raw_text) else [],
                experience_years=0.0,
                education="",
                certifications=[],
                has_work_gaps=False,
            )
