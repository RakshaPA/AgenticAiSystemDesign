# RecruitIQ — Agentic AI Resume Screening System

An AI-powered recruitment pipeline that screens resumes fairly, consistently, and at scale. Built with FastAPI, LangGraph, and a React frontend — every shortlist and rejection decision is explainable, auditable, and bias-aware.

---

## What it does

Manual resume screening at high volume breaks down in predictable ways — screeners get fatigued, decisions become inconsistent, and strong candidates get missed. RecruitIQ handles the repetitive parts automatically: it extracts skills and experience from uploaded resumes, scores them against job requirements using a weighted algorithm, strips personally identifiable information before any scoring happens, and routes each candidate to shortlist, human review, or rejection with a plain-English explanation.

No LLM is required to run the system. The scoring and bias-scrubbing pipeline is fully deterministic. An optional OpenAI key enables semantic embedding for vector similarity matching; without it, the system falls back to zero-vector scoring and still works end-to-end.

---

## Pipeline

When a resume is uploaded, it moves through six agents in a fixed sequence managed by a LangGraph orchestrator:

```
Resume Upload (PDF / DOCX)
     │
     ▼
Orchestrator (LangGraph)
     │
     ├──► 1. Bias Scrubber    → strips email, phone, address, DOB before any scoring
     │
     ├──► 2. Resume Parser    → extracts skills, experience years, projects, certifications
     │
     ├──► 3. Embedder         → generates vector for semantic similarity (OpenAI optional)
     │
     ├──► 4. Scorer           → deterministic weighted scoring against JD requirements
     │         │
     │         └── GUARDRAIL: vector similarity < 0.30 → force rejected
     │             GUARDRAIL: score < 50 → rejected, 50–71 → review, ≥72 → shortlisted
     │
     ├──► 5. Explainer        → generates plain-English reason for the decision
     │         • Shortlisted / Review → template-based explanation (no LLM cost)
     │         • LLM fallback available if OPENAI_API_KEY is set
     │
     └──► 6. Audit Logger     → writes full decision record to database (append-only)
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI (Python) + SQLite (via SQLAlchemy async) |
| Agent orchestration | LangGraph |
| Semantic matching | OpenAI `text-embedding-3-small` (optional — falls back to zero-vector) |
| Scoring | Deterministic weighted algorithm (no LLM required) |
| Bias scrubbing | Regex-based PII stripping (deterministic, no LLM) |
| Frontend | React + TypeScript + Vite |
| UI / Styling | TailwindCSS + Framer Motion |
| State management | Zustand + React Query |

> **No Anthropic API key required.** The explainer agent imports the Anthropic client but the actual resume evaluation path in `app.py` uses a mock evaluation response. The pipeline runs fully without any paid AI API keys.

---

## Project structure

```
AgenticAi/
├── resume_screener/              # FastAPI backend
│   ├── app.py                    # API entry point — all routes defined here
│   ├── orchestrator.py           # LangGraph graph definition and pipeline runner
│   ├── models.py                 # SQLAlchemy ORM models (Resume, JobDescription, AuditLog)
│   ├── schemas.py                # Pydantic request/response schemas
│   ├── db.py                     # SQLite async database connection
│   ├── guardrails.py             # Hard-stop functions (score threshold, bias check)
│   ├── audit.py                  # Audit log writer
│   ├── agents/
│   │   ├── bias_scrubber.py      # Regex PII removal + guardrail check
│   │   ├── bias_agent.py         # Extended bias analysis
│   │   ├── parser.py             # Structured data extraction from resume text
│   │   ├── embedder.py           # OpenAI embedding + cosine similarity
│   │   ├── scorer.py             # Weighted deterministic scoring
│   │   ├── shortlist_agent.py    # Decision routing
│   │   └── explainer.py          # Human-readable explanation generation
│   ├── requirements.txt
│   ├── .env.example
│   └── resume_screener.db        # SQLite database (auto-created on first run)
│
└── frontend/                     # React + Vite frontend
    └── src/
        ├── pages/
        │   ├── dashboard/        # Analytics overview
        │   ├── jobs/             # Job management + resume upload
        │   │   ├── JobsPage.tsx       # Job list with create/delete
        │   │   ├── JobDetailPage.tsx  # Job detail + resume dropzone
        │   │   └── JobCreateModal.tsx # New position form
        │   ├── candidates/       # Candidate list and detail views
        │   ├── ai/               # AI Assistant chat interface
        │   ├── audit/            # Audit log viewer
        │   └── bias/             # Bias & fairness metrics
        ├── components/           # Shared UI components (TopBar, Sidebar, Cards, etc.)
        ├── lib/
        │   ├── api.ts            # Axios API client (all backend calls)
        │   └── utils.ts          # Scoring utilities, color helpers
        └── store/                # Zustand auth store
```

---

## Getting started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A virtual environment (recommended)

No Docker, no PostgreSQL, no Redis, no paid API keys required to run locally.

### Backend

```bash
# From the repo root
cd AgenticAi

# Activate virtual environment (one-time setup if not done)
python -m venv .venv

# Activate it
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS / Linux:
source .venv/bin/activate

# Install dependencies
pip install -r resume_screener/requirements.txt

# Run the backend
cd resume_screener
uvicorn app:app --reload
```

The API starts at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

The SQLite database (`resume_screener.db`) is created automatically on first run. Three sample job positions are seeded on startup.

### Frontend

```bash
# From a separate terminal, in the repo root
cd AgenticAi/frontend

npm install
npm run dev
```

The frontend starts at `http://localhost:3000` (or the next available port).

### Environment variables (optional)

Copy `.env.example` to `.env` inside the `resume_screener/` directory:

```env
# Optional — enables real vector embeddings for semantic matching
# Without this, the embedder falls back to zero-vector (pipeline still works)
OPENAI_API_KEY=sk-...

# Optional — override default scoring thresholds
SHORTLIST_THRESHOLD=72.0
REVIEW_THRESHOLD=50.0
VECTOR_SIMILARITY_MIN=0.30

# Optional — set a real PostgreSQL URL to replace SQLite
# DATABASE_URL=postgresql+asyncpg://user:password@host:port/dbname
```

---

## API reference

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/jobs` | List all job descriptions |
| `POST` | `/jobs` | Create a new job position |
| `GET` | `/jobs/{job_id}` | Get a single job |
| `DELETE` | `/jobs/{job_id}` | Delete a job |

### Resume screening

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/jobs/{job_id}/resumes` | Upload a resume (PDF/DOCX) and get evaluation result |
| `GET` | `/jobs/{job_id}/shortlist` | Get all shortlisted candidates for a job |
| `GET` | `/jobs/{job_id}/review-queue` | Get candidates in the human review queue |
| `PATCH` | `/resumes/{resume_id}/review` | Submit a human reviewer override decision |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/analytics/dashboard` | Overall screening stats (totals, rates) |
| `GET` | `/analytics/trends` | Application volume over time |
| `GET` | `/analytics/skills` | Skill distribution across candidates |
| `GET` | `/analytics/fairness` | Bias & fairness metrics |

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/login` | Login with email + password |
| `GET` | `/auth/me` | Get current user info |

Demo accounts (no real auth — tokens are hardcoded for dev):

| Email | Password | Role |
|-------|----------|------|
| admin@recruitiq.com | password123 | admin |
| recruiter@recruitiq.com | password123 | recruiter |
| manager@recruitiq.com | password123 | hiring_manager |

---

## Scoring algorithm

The scoring is fully deterministic — no LLM involved. Each resume is scored across five dimensions:

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Required skills match | 35% | % of required skills present in resume |
| Experience | 25% | Years vs. minimum required (with partial credit) |
| Preferred skills match | 20% | % of preferred/nice-to-have skills present |
| Project relevance | 12% | How many projects use the required tech stack |
| Certifications | 8% | % of required certifications held |

**Decision thresholds** (configurable via `.env`):
- `≥ 72` → **Shortlisted**
- `50 – 71` → **Human Review**
- `< 50` → **Rejected**
- Vector similarity `< 0.30` → **Force Rejected** (regardless of score)

---

## Guardrails

Three things the system enforces at the code level:

**Bias scrubbing before scoring** — email addresses, phone numbers, physical addresses, and dates of birth are stripped from the resume text before it reaches the parser or scorer. The parser's structured output is also checked for PII leakage.

**Score threshold enforcement** — the shortlisting agent cannot shortlist a candidate whose weighted score is below 72. This check runs in both the scorer and the guardrails module (double enforcement).

**Vector similarity gate** — if the resume's semantic similarity to the job description is below 0.30, the candidate is force-rejected regardless of the weighted score. Prevents high-scoring resumes in completely unrelated fields from slipping through.

---

## Frontend pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/dashboard` | Analytics overview with charts |
| Job Management | `/jobs` | Create, search, and delete job positions |
| Job Detail | `/jobs/:jobId` | Job info + drag-and-drop resume upload with live pipeline progress |
| Candidates | `/candidates` | All evaluated candidates with filtering |
| Candidate Detail | `/candidates/:resumeId` | Full score breakdown, bias report, explanation |
| AI Assistant | `/ai-assistant` | Natural language query interface for candidate search |
| Review Queue | `/review-queue` | Candidates flagged for human review |
| Bias & Fairness | `/bias-fairness` | Fairness metrics and parity scores |
| Audit Logs | `/audit-logs` | Full decision audit trail |
