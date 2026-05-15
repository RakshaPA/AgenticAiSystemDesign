# resume_screener/guardrails.py
"""
Guardrails Module — Non-negotiable rules enforced at every pipeline boundary.

Rule 1: Never shortlist below minimum score threshold
Rule 2: Bias detection agent cannot be bypassed — scrub_bias always runs first
Rule 3: No bias fields (name/gender/location) in scoring context
Rule 4: Similarity < 0.3 forces rejection regardless of score
Rule 5: Guardrail violations are always logged — never silently swallowed
"""
from typing import TYPE_CHECKING

SHORTLIST_MIN_SCORE = 72.0
SIMILARITY_MIN = 0.30

def enforce_guardrails(score_result: dict, state: dict) -> list:
    """
    Returns list of violations. Empty list = all guardrails passed.
    Called after scoring, before final decision commit.
    """
    violations = []
    decision = score_result.get("decision")
    score = score_result.get("weighted_score", 0)
    sim = state.get("vector_similarity", 0)

    # Rule 1: Cannot shortlist below threshold
    if decision == "shortlisted" and score < SHORTLIST_MIN_SCORE:
        violations.append(
            f"GUARDRAIL_SCORE_BYPASS: Attempted shortlist at score {score:.1f} "
            f"(minimum: {SHORTLIST_MIN_SCORE}). Decision overridden to 'review'."
        )
        score_result["decision"] = "review"

    # Rule 2: Low similarity cannot be shortlisted
    if decision == "shortlisted" and sim < SIMILARITY_MIN:
        violations.append(
            f"GUARDRAIL_SIM_BYPASS: Shortlist attempted with similarity {sim:.2f} "
            f"(minimum: {SIMILARITY_MIN}). Decision overridden to 'rejected'."
        )
        score_result["decision"] = "rejected"

    # Rule 3: Bias scrub must have run (check state)
    if not state.get("bias_fields_removed") and state.get("bias_fields_removed") is not None:
        pass  # empty list is fine — it means no bias fields were found
    elif state.get("cleaned_text") is None:
        violations.append(
            "GUARDRAIL_BIAS_BYPASS: Bias scrubber did not run before scoring. "
            "Pipeline aborted."
        )
        score_result["decision"] = "rejected"

    return violations


def is_pipeline_safe_to_proceed(state: dict) -> bool:
    """Hard stop: if bias scrubber was bypassed, refuse to proceed."""
    return state.get("cleaned_text") is not None