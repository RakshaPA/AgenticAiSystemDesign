from .schemas import ParsedCandidate, BiasCheckResult


class GuardrailEnforcer:

    SCORE_THRESHOLD = 75.0
    MANUAL_REVIEW_FLOOR = 55.0

    @staticmethod
    def validate_parsed_candidate(parsed: ParsedCandidate) -> list[str]:
        """Returns list of violation strings. Empty = clean."""
        violations: list[str] = []
        parsed_dict = parsed.model_dump()
        forbidden_keys = [
            "name",
            "email",
            "phone",
            "gender",
            "location",
            "age",
            "address",
            "dob",
        ]
        for key in forbidden_keys:
            if key in parsed_dict and parsed_dict[key]:
                violations.append(f"Forbidden field present: {key}")
        return violations

    @staticmethod
    def enforce_bias_gate(bias: BiasCheckResult) -> bool:
        """Returns True if candidate can proceed to shortlisting."""
        return bias.passed

    @staticmethod
    def enforce_score_gate(score: float) -> tuple[str, bool]:
        """Returns (decision_category, requires_review)"""
        if score >= GuardrailEnforcer.SCORE_THRESHOLD:
            return "shortlisted", False
        elif score >= GuardrailEnforcer.MANUAL_REVIEW_FLOOR:
            return "manual_review", True
        else:
            return "rejected", False

    @staticmethod
    def check_pipeline_integrity(stages_completed: list[str]) -> bool:
        """Verify bias check was not skipped before shortlisting."""
        required_order = ["parsing", "matching", "bias_check"]
        return all(stage in stages_completed for stage in required_order)
