# resume_screener/orchestrator.py
"""
LangGraph Orchestrator — Updated Pipeline

Flow:
  upload → scrub_bias → parse → embed → vector_filter → score → [explain if needed] → audit

Guardrails enforced at each node boundary.
LLM only called at: parse + explain (shortlisted/review only)
"""
import uuid
import datetime
from typing import TypedDict, Optional
from langgraph.graph import StateGraph, END

from agents.bias_scrubber import scrub_bias, guardrail_check_bias_fields
from agents.parser import parse_resume
from agents.embedder import get_embedding, cosine_similarity
from agents.scorer import run_scorer
from agents.explainer import generate_explanation
from guardrails import enforce_guardrails
from audit import write_audit_log

# ── State schema ─────────────────────────────────────────────────────────────
class ScreeningState(TypedDict):
    resume_id: str
    job_id: str
    raw_text: str
    jd: dict                         # full JD dict from DB
    # populated progressively
    cleaned_text: Optional[str]
    bias_fields_removed: Optional[list]
    structured_data: Optional[dict]
    resume_embedding: Optional[list]
    vector_similarity: Optional[float]
    score_result: Optional[dict]
    decision: Optional[str]
    llm_explanation: Optional[str]
    guardrail_violations: list
    error: Optional[str]

# ── Node: Bias Scrubber ──────────────────────────────────────────────────────
async def node_scrub_bias(state: ScreeningState) -> ScreeningState:
    cleaned, removed = scrub_bias(state["raw_text"])
    return {**state, "cleaned_text": cleaned, "bias_fields_removed": removed}

# ── Node: Resume Parser ──────────────────────────────────────────────────────
async def node_parse_resume(state: ScreeningState) -> ScreeningState:
    structured = await parse_resume(state["cleaned_text"])
    
    # GUARDRAIL: ensure parsed output has no leaked PII
    violations = guardrail_check_bias_fields(structured)
    existing = state.get("guardrail_violations", [])
    
    return {**state, "structured_data": structured,
            "guardrail_violations": existing + violations}

# ── Node: Embed Resume ───────────────────────────────────────────────────────
async def node_embed_resume(state: ScreeningState) -> ScreeningState:
    embedding = await get_embedding(state["cleaned_text"])
    jd_embedding = state["jd"].get("embedding")  # pre-stored in DB
    
    sim = cosine_similarity(embedding, jd_embedding) if jd_embedding else 0.5
    
    return {**state, "resume_embedding": embedding, "vector_similarity": sim}

# ── Node: Score ──────────────────────────────────────────────────────────────
async def node_score(state: ScreeningState) -> ScreeningState:
    score_result = run_scorer(
        state["structured_data"],
        state["jd"],
        state["vector_similarity"]
    )
    
    # GUARDRAIL: cannot shortlist below threshold (enforced in scorer but double-checked)
    violations = enforce_guardrails(score_result, state)
    existing = state.get("guardrail_violations", [])
    
    return {
        **state,
        "score_result": score_result,
        "decision": score_result["decision"],
        "guardrail_violations": existing + violations,
    }

# ── Node: LLM Explain ───────────────────────────────────────────────────────
async def node_explain(state: ScreeningState) -> ScreeningState:
    explanation = await generate_explanation(
        decision=state["decision"],
        score_breakdown=state["score_result"]["score_breakdown"],
        structured_data=state["structured_data"],
        jd=state["jd"],
    )
    return {**state, "llm_explanation": explanation}

# ── Node: Audit Log ──────────────────────────────────────────────────────────
async def node_audit(state: ScreeningState) -> ScreeningState:
    await write_audit_log(state)
    return state

# ── Routing: skip LLM explain for pure rejections to save cost ───────────────
def route_after_score(state: ScreeningState) -> str:
    # Always explain shortlisted and review; use template for rejected (in explainer)
    return "explain"  # explainer handles template vs LLM internally

# ── Build Graph ───────────────────────────────────────────────────────────────
def build_screening_graph() -> StateGraph:
    graph = StateGraph(ScreeningState)
    
    graph.add_node("scrub_bias", node_scrub_bias)
    graph.add_node("parse_resume", node_parse_resume)
    graph.add_node("embed_resume", node_embed_resume)
    graph.add_node("score", node_score)
    graph.add_node("explain", node_explain)
    graph.add_node("audit", node_audit)
    
    graph.set_entry_point("scrub_bias")
    graph.add_edge("scrub_bias", "parse_resume")
    graph.add_edge("parse_resume", "embed_resume")
    graph.add_edge("embed_resume", "score")
    graph.add_conditional_edges("score", route_after_score, {"explain": "explain"})
    graph.add_edge("explain", "audit")
    graph.add_edge("audit", END)
    
    return graph.compile()

screening_graph = build_screening_graph()

async def run_screening_pipeline(
    resume_id: str, job_id: str, raw_text: str, jd: dict
) -> ScreeningState:
    initial_state: ScreeningState = {
        "resume_id": resume_id,
        "job_id": job_id,
        "raw_text": raw_text,
        "jd": jd,
        "cleaned_text": None,
        "bias_fields_removed": None,
        "structured_data": None,
        "resume_embedding": None,
        "vector_similarity": None,
        "score_result": None,
        "decision": None,
        "llm_explanation": None,
        "guardrail_violations": [],
        "error": None,
    }
    result = await screening_graph.ainvoke(initial_state)
    return result