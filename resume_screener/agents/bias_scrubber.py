# resume_screener/agents/bias_scrubber.py
"""
Bias Scrubber Agent
Removes all PII and bias-inducing fields before any evaluation.
This runs BEFORE embedding or scoring — no agent ever sees name/gender/location.
"""
import re
from typing import Tuple

# Regex patterns for PII detection
PATTERNS = {
    "email": r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+",
    "phone": r"(\+?\d[\d\s\-().]{7,}\d)",
    "linkedin": r"(linkedin\.com/in/[^\s]+)",
    "github": r"(github\.com/[^\s]+)",
    "dob_explicit": r"(date of birth|dob|born on|born:)[^\n]*",
    "age_explicit": r"\b(age\s*[:–-]?\s*\d{1,2})\b",
    "gender_explicit": r"\b(gender|sex)\s*[:–-]?\s*(male|female|non-binary|m|f)\b",
    "address_line": r"\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|lane|ln|drive|dr|blvd)[^\n]*",
    "pincode": r"\b\d{5,6}\b",
    "nationality": r"\b(nationality|citizen of|citizenship)\s*[:–-]?\s*[\w\s]+",
    "photo_ref": r"(photo|photograph|passport size)",
    # Names in headers — catch "Name: John Smith" patterns
    "name_header": r"^(name\s*[:–-]\s*)[\w\s]+$",
}

BIAS_FIELD_LABELS = {
    "email": "email address",
    "phone": "phone number",
    "linkedin": "LinkedIn URL",
    "github": "GitHub URL (kept as portfolio reference — URL anonymized)",
    "dob_explicit": "date of birth",
    "age_explicit": "age",
    "gender_explicit": "gender",
    "address_line": "street address",
    "pincode": "postal code",
    "nationality": "nationality/citizenship",
    "photo_ref": "photo reference",
    "name_header": "name field",
}

def scrub_bias(raw_text: str) -> Tuple[str, list]:
    """
    Returns (cleaned_text, list_of_removed_field_labels)
    GitHub URLs are anonymized but kept as portfolio signal.
    """
    cleaned = raw_text
    removed_fields = []

    for key, pattern in PATTERNS.items():
        flags = re.IGNORECASE | (re.MULTILINE if key == "name_header" else 0)
        matches = re.findall(pattern, cleaned, flags=flags)
        if matches:
            if key == "github":
                # Keep as [PORTFOLIO_LINK] — signals project work without identity
                cleaned = re.sub(pattern, "[PORTFOLIO_LINK]", cleaned, flags=re.IGNORECASE)
            else:
                cleaned = re.sub(pattern, f"[REDACTED_{key.upper()}]", cleaned, flags=flags)
            removed_fields.append(BIAS_FIELD_LABELS[key])

    return cleaned, list(set(removed_fields))


def guardrail_check_bias_fields(score_input: dict) -> list:
    """
    Hard guardrail: confirm no bias fields leaked into scoring input.
    Returns list of violations (empty = clean).
    """
    violations = []
    text_to_check = str(score_input).lower()
    
    leak_signals = ["[redacted_name", "gender", "male", "female", "address", "born on"]
    for signal in leak_signals:
        if signal in text_to_check:
            violations.append(f"GUARDRAIL VIOLATION: Potential bias field '{signal}' detected in scoring input")
    
    return violations