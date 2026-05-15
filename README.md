# RecruitIQ — Agentic AI Resume Screening System

An AI-powered recruitment pipeline that screens resumes fairly, consistently, and at scale. Built with FastAPI, LangGraph, and Claude — designed so every shortlist and rejection decision is explainable, auditable, and bias-free.

---

## Why this exists

Manual resume screening at high volume breaks down in predictable ways — screeners get fatigued, decisions become inconsistent, and strong candidates slip through the cracks. This system handles the repetitive parts of screening automatically while keeping humans in control of the final call. It's not trying to replace recruiters; it's trying to give them a clean, ranked, bias-checked shortlist instead of a pile of 3,000 PDFs.

---

## How it works

When a resume is uploaded, it moves through four specialized AI agents in a fixed sequence managed by an orchestrator. No step can be skipped. No agent can shortlist a candidate without passing through bias detection first.

```
Resume Upload
     │
     ▼
Orchestrator (LangGraph)
     │
     ├──► Resume Parser      →  extracts skills, experience, education
     │
     ├──► JD Matcher         →  scores semantic fit against the job description
     │
     ├──► Bias Detector      →  strips name, location, graduation year; blocks pipeline if it finds issues
     │
     └──► Shortlisting Agent →  makes SHORTLIST / REJECT / HUMAN_REVIEW decision with a plain-English reason
          │
          ▼
     Audit Log (every step recorded, append-only)
          │
          ▼
     HR Review Dashboard
```

The bias detection agent is a hard gate. If it returns anything other than `PASSED`, the pipeline halts and routes to human review — the shortlisting agent never runs.

---

## Tech stack

| Layer | Technology |
|---|---|
| API | FastAPI (Python) |
| Agent orchestration | LangGraph |
| AI inference | Anthropic Claude (claude-sonnet-4) |
| Semantic matching | OpenAI text-embedding-3-small + pgvector |
| Job queue | Celery + Redis |
| Database | PostgreSQL with pgvector extension |
| Monitoring | Prometheus + Grafana |
| Containerisation | Docker + Docker Compose |

---

## Project structure

```
recruitiq/
├── app/
│   ├── main.py                  # FastAPI entry point
│   ├── routers/
│   │   ├── upload.py            # POST /upload-resume
│   │   ├── shortlist.py         # GET /shortlist/{job_id}
│   │   └── audit.py             # GET /audit/{candidate_id}
│   ├── agents/
│   │   ├── orchestrator.py      # LangGraph graph definition
│   │   ├── parse_agent.py       # extracts structured profile from resume text
│   │   ├── match_agent.py       # cosine similarity against JD embeddings
│   │   ├── bias_agent.py        # strips and flags protected attributes
│   │   └── shortlist_agent.py   # score-gated decision agent
│   ├── guardrails.py            # hard-stop functions (bias bypass block, score threshold)
│   ├── models/                  # SQLAlchemy ORM models
│   └── db.py                    # Postgres + pgvector connection
├── worker/
│   └── tasks.py                 # Celery task: run_pipeline
├── monitoring/
│   └── metrics.py               # Prometheus counters, bias drift checks
├── tests/
│   ├── test_agents.py
│   ├── test_guardrails.py
│   └── test_bias_detection.py
├── docker-compose.yml
├── .env.example
└── requirements.txt
```

---

## Getting started

**Prerequisites:** Docker, Docker Compose, and API keys for Anthropic and OpenAI.

```bash
# 1. Clone the repo
git clone https://github.com/RakshaPA/AgenticAiSystemDesign
cd AgenticAiSystemDesign

# 2. Set up environment variables
cp .env.example .env
# Add your ANTHROPIC_API_KEY and OPENAI_API_KEY to .env

# 3. Start everything
docker-compose up --build
```

That's it. The API will be running at `http://localhost:8000` and the Celery worker will start processing jobs automatically. Swagger docs are at `http://localhost:8000/docs`.

---

## API reference

### Upload a resume

```http
POST /upload-resume
Content-Type: multipart/form-data

file=<resume.pdf>
job_id=<job_id>
```

Returns a `candidate_id` immediately. Processing happens in the background.

```json
{
  "candidate_id": "c8a3f1b2-...",
  "status": "queued"
}
```

### Get shortlist for a job

```http
GET /shortlist/{job_id}
```

Returns all candidates who passed the pipeline for that role, with scores and reasons.

### Get audit trail for a candidate

```http
GET /audit/{candidate_id}
```

Returns the full decision log — every agent's input, output, and timestamp. This is what HR uses to review or challenge any decision.

---

## Guardrails

Three things the system will never do, enforced at the code level:

**Bias-based rejection** — the bias detection agent runs before every shortlist decision. If it flags protected attributes or returns a non-`PASSED` status, the pipeline stops and the case goes to human review. The orchestrator's conditional edge makes it impossible to route around this.

**Score bypass** — the shortlisting agent checks the match score against a configurable threshold before making any decision. A candidate with a score below the minimum cannot be shortlisted, regardless of what else the agent might infer.

**Shortlisting without a reason** — every decision (shortlist or reject) requires a plain-English `reason` field. If the agent doesn't produce one, the response fails schema validation and the pipeline halts.

---

## Monitoring and bias drift

Every pipeline run emits Prometheus metrics. Key things tracked:

- Shortlist rate by job and week
- Bias flag rate (what percentage of resumes trigger the bias detector)
- Agent latency per step
- HR override rate (how often HR reverses an AI decision)

A weekly cron job runs a disparate impact analysis — if shortlist rates start correlating with protected attribute proxies (name origin, location tier, university type), an alert fires and auto-shortlisting is paused pending review.

---

## Success metrics

| Metric | Target |
|---|---|
| Time to first shortlist | ≤ 72 hours |
| Bias-flagged rejection rate | < 0.5% of all rejections |
| HR override rate | < 10% (trust indicator) |
| Disparate impact ratio | > 0.8 across demographic proxies |

---

## Environment variables

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://postgres:postgres@db:5432/recruitiq
REDIS_URL=redis://redis:6379/0
MATCH_SCORE_THRESHOLD=70        # minimum score to shortlist (0-100)
HUMAN_REVIEW_BAND=5             # candidates within this band of threshold go to HR
```

---

## Running tests

```bash
# Run all tests
docker-compose exec app pytest tests/ -v

# Run just the guardrail tests
docker-compose exec app pytest tests/test_guardrails.py -v
```

The guardrail tests are the most important ones — they verify that the bias bypass block, score threshold, and pipeline ordering cannot be circumvented under any input.

---

## Design thinking approach

See [`DESIGN_THINKING.md`](./DESIGN_THINKING.md) for the full problem framing, HMW statement, stakeholder analysis, and agent design rationale.

---

## Contributing

Open an issue before submitting a PR, especially for anything touching the guardrails or bias detection logic — those need extra care. All agent prompts are in `app/agents/` and are the most likely place to iterate.

---

