from datetime import datetime
from .schemas import MatchResult, BiasCheckResult, ShortlistEntry


def make_decision(match: MatchResult, bias: BiasCheckResult, file_name: str) -> ShortlistEntry:
    score = match.match_score
    if not bias.passed:
        reason = (
            "Flagged for human review: potential bias signals detected. "
            "HR must review before any decision is made."
        )
        decision = "manual_review"
    else:
        if score >= 75.0:
            decision = "shortlisted"
            reason = f"Strong match ({score:.0f}/100). {match.score_rationale}"
        elif score >= 55.0:
            decision = "manual_review"
            reason = (
                f"Borderline match ({score:.0f}/100). Recommend HR review. {match.score_rationale}"
            )
        else:
            decision = "rejected"
            missing = ", ".join(match.missing_skills[:3]) if match.missing_skills else "general fit gaps"
            reason = f"Below threshold ({score:.0f}/100). Key missing skills: {missing}."

    return ShortlistEntry(
        candidate_id=match.candidate_id,
        file_name=file_name,
        job_id=match.job_id,
        match_score=score,
        decision=decision,
        reason=reason,
        bias_passed=bias.passed,
        timestamp=datetime.now().isoformat(),
    )
