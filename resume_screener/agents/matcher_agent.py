from __future__ import annotations

import openai
from sentence_transformers import SentenceTransformer, util
from .schemas import ParsedCandidate, MatchResult

MODEL = SentenceTransformer("all-MiniLM-L6-v2")
_jd_embedding_cache: dict[str, list[float]] = {}

KNOWN_TECH_KEYWORDS = {
    "python", "sql", "aws", "fastapi", "react", "docker", "kubernetes", "tensorflow",
    "pytorch", "java", "javascript", "typescript", "graphql", "rest", "api",
    "postgresql", "mysql", "mongodb", "redis", "azure", "gcp", "linux",
    "node", "nodejs", "django", "flask", "spring", "c++", "c#", "go",
    "golang", "rust", "scala", "swift", "kotlin", "php", "ruby", "html",
    "css", "sass", "less", "bootstrap", "tailwind", "vue", "angular",
    "jenkins", "circleci", "gitlab", "github", "ci/cd", "terraform", "ansible",
    "helm", "spark", "hadoop", "etl", "airflow", "ml", "machine learning",
    "nlp", "natural language processing", "computer vision", "data engineering",
    "data science", "analytics", "scala", "docker-compose", "prometheus",
    "grafana", "microservices", "event-driven", "restful", "serverless",
    "lambda", "ecs", "eks", "dynamodb", "elasticache", "redshift",
    "s3", "cloudwatch", "kinesis", "postgres", "mysql", "oracle", "sql server",
    "spark", "databricks", "airflow", "rabbitmq", "kafka", "activemq",
    "socket.io", "grpc", "grpc", "websockets", "oauth", "jwt", "saml",
    "openapi", "swagger", "postman", "junit", "pytest", "unittest",
    "selenium", "cucumber", "jmeter", "load testing", "performance",
    "aws lambda", "fargate", "cloudformation", "azure devops", "gcp", "bigquery",
    "powerbi", "tableau", "metabase", "elastic", "elasticsearch", "logstash",
    "kibana", "riak", "cassandra", "neo4j", "jenkins", "git", "version control",
    "agile", "scrum", "kanban", "product ownership", "project management",
    "leadership", "communication", "teamwork", "problem solving", "presentation",
    "time management", "mentoring", "coaching", "stakeholder management",
    "devops", "sre", "site reliability", "security", "penetration testing",
    "oauth2", "sso", "hashicorp", "vault", "elixir", "haskell", "matlab",
    "r", "stata", "sas", "jira", "confluence", "notion", "airtable",
    "salesforce", "sap", "erp", "business intelligence", "etl pipelines",
    "distributed systems", "multithreading", "concurrency", "performance tuning",
    "algorithms", "data structures", "computer science", "design patterns",
    "object oriented", "functional programming", "rest api", "docker swarm",
    "micro frontends", "headless cms", "content management", "spark sql",
    "mapreduce", "distributed computing", "data modeling", "schema design",
    "containerization", "orchestration", "load balancing", "cdn", "iam",
    "networking", "tcp/ip", "ssl", "tls", "encryption", "monitoring",
    "logging", "debugging", "optimization", "refactoring", "code review",
    "testing", "automation", "ci cd", "release management", "incident response",
    "vpc", "subnet", "ec2", "s3 bucket", "cloud security", "design systems",
    "cross functional", "stakeholder engagement", "business requirements",
}


def _prepare_text(value: str) -> str:
    return value.lower().replace("/", " ").replace("-", " ").replace(".", " ")


def _extract_jd_required_skills(jd_text: str) -> set[str]:
    normalized = _prepare_text(jd_text)
    tokens = {token.strip() for token in normalized.replace(",", " ").split() if token.strip()}
    required = {term for term in KNOWN_TECH_KEYWORDS if term in normalized or term in tokens}
    return required


def _get_jd_embedding(job_id: str, jd_text: str):
    if job_id not in _jd_embedding_cache:
        _jd_embedding_cache[job_id] = MODEL.encode(jd_text, convert_to_tensor=True)
    return _jd_embedding_cache[job_id]


def _compute_semantic_score(candidate_text: str, jd_text: str, job_id: str) -> float:
    candidate_embedding = MODEL.encode(candidate_text, convert_to_tensor=True)
    jd_embedding = _get_jd_embedding(job_id, jd_text)
    similarity = util.cos_sim(candidate_embedding, jd_embedding).item()
    return max(0.0, min(100.0, float(similarity) * 100.0))


def _build_score_rationale(skills: list[str], matched_skills: list[str], missing_skills: list[str], score: float) -> str:
    prompt = f"""
Given:
- Candidate skills: {skills}
- Matched skills: {matched_skills}
- Missing skills: {missing_skills}
- Match score: {score:.0f}/100

Write ONE sentence explaining why this candidate scored {score:.0f}/100 for this role. Be specific. Mention 1-2 matched skills and 1-2 gaps.
Return only the sentence, no prefix.
"""
    completion = openai.ChatCompletion.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are an expert recruiter summarization assistant."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        max_tokens=60,
    )
    return completion.choices[0].message.content.strip()


def match_candidate(parsed: ParsedCandidate, jd_text: str, job_id: str) -> MatchResult:
    skills_text = ", ".join(parsed.skills) if parsed.skills else ""
    semantic_score = _compute_semantic_score(skills_text, jd_text, job_id)

    jd_required_skills = _extract_jd_required_skills(jd_text)
    normalized_candidate_skills = {skill.lower() for skill in parsed.skills}
    matched_skills = [skill for skill in parsed.skills if skill.lower() in jd_required_skills]
    missing_skills = sorted({skill for skill in jd_required_skills if skill not in normalized_candidate_skills})

    keyword_score = len(matched_skills) / max(len(jd_required_skills), 1) * 100.0
    match_score = round((semantic_score * 0.6) + (keyword_score * 0.4), 1)

    rationale = _build_score_rationale(parsed.skills, matched_skills, missing_skills, match_score)

    return MatchResult(
        candidate_id=parsed.candidate_id,
        job_id=job_id,
        match_score=match_score,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        score_rationale=rationale,
    )
