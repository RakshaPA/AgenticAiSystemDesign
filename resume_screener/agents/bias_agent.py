import json
import re
from typing import Any
import openai
import spacy
from .schemas import ParsedCandidate, BiasCheckResult

nlp = spacy.load("en_core_web_sm")

BIAS_PROMPT_TEMPLATE = """
Review this candidate evaluation for bias.
Score rationale: "{rationale}"

Check if this rationale contains:
1. References to protected attributes (name ethnicity, gender, age, location)
2. Penalization of employment gaps without skill justification
3. Proxy discrimination (university prestige, graduation year as age signal)

Return ONLY JSON:
{
  "bias_detected": boolean,
  "flags": ["list of specific problematic phrases or signals found"]
}
Return empty flags list if no bias found.
"""

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(r"(?:\+\d{1,3}[\s-])?(?:\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})")
LINKEDIN_RE = re.compile(r"linkedin\.com/[A-Za-z0-9_\-/.]+", re.IGNORECASE)


def _detect_pii(raw_text: str) -> list[str]:
    doc = nlp(raw_text)
    pii_found: set[str] = set()
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            pii_found.add("person")
        elif ent.label_ == "GPE":
            pii_found.add("location")
        elif ent.label_ == "DATE":
            pii_found.add("date")
    if EMAIL_RE.search(raw_text):
        pii_found.add("email")
    if PHONE_RE.search(raw_text):
        pii_found.add("phone")
    if LINKEDIN_RE.search(raw_text):
        pii_found.add("linkedin")
    return sorted(pii_found)


def _detect_proxy_bias(parsed: ParsedCandidate, raw_text: str) -> list[str]:
    flags: list[str] = []
    education = parsed.education.lower()
    if any(keyword in education for keyword in ["university", "college", "institute"]):
        flags.append("education listed as university prestige")
    if parsed.has_work_gaps and re.search(r"gap|career break|sabbatical|unemployed|break", raw_text, re.IGNORECASE):
        flags.append("work gap mentioned without skill context")
    if re.search(r"\b(19|20)\d{2}\b", raw_text) and "graduation" in raw_text.lower():
        flags.append("graduation year present and may proxy age")
    if re.search(r"\bage\b|birth|born", raw_text, re.IGNORECASE):
        flags.append("age-related information present")
    return flags


def _call_bias_review(rationale: str) -> dict[str, Any]:
    completion = openai.ChatCompletion.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are an expert fairness reviewer for hiring systems."},
            {"role": "user", "content": BIAS_PROMPT_TEMPLATE.format(rationale=rationale)},
        ],
        temperature=0.0,
        max_tokens=120,
    )
    text = completion.choices[0].message.content.strip()
    try:
        return json.loads(text)
    except Exception:
        cleaned = text.strip("`\n ")
        return json.loads(cleaned)


def check_bias(parsed: ParsedCandidate, raw_text: str) -> BiasCheckResult:
    pii_found = _detect_pii(raw_text)
    proxy_flags = _detect_proxy_bias(parsed, raw_text)

    rationale_text = (
        f"Candidate skills: {parsed.skills}. Education: {parsed.education}. "
        f"Work gaps: {parsed.has_work_gaps}. Resume excerpt: {raw_text[:500]}"
    )
    try:
        bias_review = _call_bias_review(rationale_text)
        bias_detected = bool(bias_review.get("bias_detected"))
        flags = bias_review.get("flags") or []
        if not isinstance(flags, list):
            flags = [str(flags)]
    except Exception:
        bias_detected = bool(proxy_flags)
        flags = proxy_flags

    all_flags = sorted(set(flags + proxy_flags))
    passed = len(pii_found) == 0 and not bias_detected
    requires_human_review = bias_detected or len(pii_found) > 0

    return BiasCheckResult(
        candidate_id=parsed.candidate_id,
        passed=passed,
        pii_found=pii_found,
        bias_flags=all_flags,
        requires_human_review=requires_human_review,
    )
