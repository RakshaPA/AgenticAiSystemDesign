import { useState } from "react";

type ShortlistEntry = {
  candidate_id: string;
  file_name: string;
  job_id: string;
  match_score: number;
  decision: "shortlisted" | "manual_review" | "rejected";
  reason: string;
  bias_passed: boolean;
  timestamp: string;
};

type AuditRecord = {
  stage: string;
  decision: string;
  timestamp: string;
  details: string;
};

const PLACEHOLDER_JD = `We are hiring a Senior Backend Engineer for a fast-growing fintech startup. The ideal candidate has 4+ years of experience building scalable APIs and backend systems with Python, FastAPI, PostgreSQL, Redis, AWS, and Docker. Responsibilities include owning service architecture, delivering payment workflows, implementing secure data access, and collaborating closely with product and design teams. Candidates should have a strong understanding of distributed systems, cloud deployment, database design, and performance tuning. Experience with CI/CD, monitoring, and mentoring junior engineers is preferred.`;

function getScoreColor(score: number) {
  if (score >= 75) return "#0f9d58";
  if (score >= 55) return "#f29900";
  return "#d62828";
}

function App() {
  const [jobId, setJobId] = useState(() => crypto.randomUUID());
  const [jdText, setJdText] = useState(PLACEHOLDER_JD);
  const [files, setFiles] = useState<FileList | null>(null);
  const [results, setResults] = useState<ShortlistEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [auditTrail, setAuditTrail] = useState<Record<string, AuditRecord[]>>({});
  const [error, setError] = useState<string | null>(null);

  const shortlisted = results.filter((item) => item.decision === "shortlisted");
  const manualReview = results.filter((item) => item.decision === "manual_review");
  const rejected = results.filter((item) => item.decision === "rejected");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(event.target.files);
  };

  const fetchAuditTrail = async (candidateId: string) => {
    if (auditTrail[candidateId]) return;
    try {
      const response = await fetch(`/api/audit/${candidateId}`);
      if (!response.ok) throw new Error("Failed to load audit trail.");
      const data = (await response.json()) as AuditRecord[];
      setAuditTrail((prev) => ({ ...prev, [candidateId]: data }));
    } catch (err) {
      setError("Unable to load audit trail.");
    }
  };

  const handleScreen = async () => {
    setError(null);
    if (!files || files.length === 0) {
      setError("Please upload at least one resume PDF.");
      return;
    }
    if (!jdText.trim()) {
      setError("Job description cannot be empty.");
      return;
    }

    const formData = new FormData();
    formData.append("job_id", jobId);
    formData.append("jd_text", jdText);
    for (const file of Array.from(files)) {
      formData.append("files", file);
    }

    setLoading(true);
    setStatusText("Uploading resumes and screening candidates...");
    try {
      const response = await fetch("/api/screen", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Screening failed.");
      }
      const data = (await response.json()) as ShortlistEntry[];
      setResults(data);
      setStatusText("Screening complete.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = () => {
    if (!results.length) return;
    const headers = ["candidate_id", "file_name", "job_id", "match_score", "decision", "reason", "bias_passed", "timestamp"];
    const rows = results
      .map((result) =>
        [result.candidate_id, result.file_name, result.job_id, result.match_score.toFixed(1), result.decision, result.reason, result.bias_passed.toString(), result.timestamp]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const csv = `${headers.join(",")}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `screening_results_${jobId}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-shell">
      <header className="hero-card">
        <div>
          <h1>AI Resume Screener</h1>
          <p className="subtitle">Agentic pipeline: Parse → Match → Bias Check → Shortlist</p>
        </div>
      </header>

      <section className="layout-grid">
        <aside className="panel sidebar-panel">
          <h2>Job inputs</h2>
          <label>
            Job ID
            <input value={jobId} onChange={(e) => setJobId(e.target.value)} />
          </label>
          <label>
            Job Description
            <textarea value={jdText} onChange={(e) => setJdText(e.target.value)} rows={10} />
          </label>
          <label>
            Resume Upload
            <input type="file" accept="application/pdf" multiple onChange={handleFileChange} />
          </label>
          <button className="primary-button" onClick={handleScreen} disabled={loading}>
            {loading ? "Screening resumes…" : "Screen Resumes"}
          </button>
          {error ? <div className="error-box">{error}</div> : null}
          {statusText ? <div className="status-box">{statusText}</div> : null}
        </aside>

        <main className="panel content-panel">
          <div className="metrics-row">
            <div className="metric-card success">
              <span className="metric-label">Shortlisted</span>
              <strong>{shortlisted.length}</strong>
            </div>
            <div className="metric-card warning">
              <span className="metric-label">Manual Review</span>
              <strong>{manualReview.length}</strong>
            </div>
            <div className="metric-card danger">
              <span className="metric-label">Rejected</span>
              <strong>{rejected.length}</strong>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="empty-state">
              Upload resumes and enter a job description, then click &quot;Screen Resumes&quot; to begin.
            </div>
          ) : (
            <>
              <section className="section-card">
                <div className="section-header success">Shortlisted ({shortlisted.length})</div>
                {shortlisted.length === 0 ? <p className="small-note">No strong matches yet.</p> : null}
                {shortlisted.map((entry) => (
                  <div key={entry.candidate_id} className="result-card">
                    <div className="result-header">
                      <strong>{entry.file_name}</strong>
                      <span className="badge" style={{ backgroundColor: getScoreColor(entry.match_score) }}>
                        {entry.match_score.toFixed(1)}
                      </span>
                    </div>
                    <p>{entry.reason}</p>
                    <button onClick={() => fetchAuditTrail(entry.candidate_id)}>View Audit Trail</button>
                    {auditTrail[entry.candidate_id] ? (
                      <div className="audit-box">
                        <table>
                          <thead>
                            <tr>
                              <th>Stage</th>
                              <th>Decision</th>
                              <th>Timestamp</th>
                            </tr>
                          </thead>
                          <tbody>
                            {auditTrail[entry.candidate_id].map((record, index) => (
                              <tr key={index}>
                                <td>{record.stage}</td>
                                <td>{record.decision}</td>
                                <td>{record.timestamp}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                ))}
              </section>

              <section className="section-card">
                <div className="section-header warning">Manual Review ({manualReview.length})</div>
                <p className="info-note">These require HR decision before any action is taken.</p>
                {manualReview.map((entry) => (
                  <div key={entry.candidate_id} className="result-card">
                    <div className="result-header">
                      <strong>{entry.file_name}</strong>
                      <span className="badge" style={{ backgroundColor: getScoreColor(entry.match_score) }}>
                        {entry.match_score.toFixed(1)}
                      </span>
                    </div>
                    <p>{entry.reason}</p>
                    <button onClick={() => fetchAuditTrail(entry.candidate_id)}>View Audit Trail</button>
                    {auditTrail[entry.candidate_id] ? (
                      <div className="audit-box">
                        <table>
                          <thead>
                            <tr>
                              <th>Stage</th>
                              <th>Decision</th>
                              <th>Timestamp</th>
                            </tr>
                          </thead>
                          <tbody>
                            {auditTrail[entry.candidate_id].map((record, index) => (
                              <tr key={index}>
                                <td>{record.stage}</td>
                                <td>{record.decision}</td>
                                <td>{record.timestamp}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                ))}
              </section>

              <section className="section-card">
                <div className="section-header danger">Rejected ({rejected.length})</div>
                {rejected.map((entry) => (
                  <div key={entry.candidate_id} className="result-card">
                    <div className="result-header">
                      <strong>{entry.file_name}</strong>
                      <span className="badge" style={{ backgroundColor: getScoreColor(entry.match_score) }}>
                        {entry.match_score.toFixed(1)}
                      </span>
                    </div>
                    <p>{entry.reason}</p>
                    <button onClick={() => fetchAuditTrail(entry.candidate_id)}>View Audit Trail</button>
                    {auditTrail[entry.candidate_id] ? (
                      <div className="audit-box">
                        <table>
                          <thead>
                            <tr>
                              <th>Stage</th>
                              <th>Decision</th>
                              <th>Timestamp</th>
                            </tr>
                          </thead>
                          <tbody>
                            {auditTrail[entry.candidate_id].map((record, index) => (
                              <tr key={index}>
                                <td>{record.stage}</td>
                                <td>{record.decision}</td>
                                <td>{record.timestamp}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                ))}
              </section>

              <button className="secondary-button" onClick={downloadCsv} disabled={results.length === 0}>
                Download Results CSV
              </button>
            </>
          )}
        </main>
      </section>
    </div>
  );
}

export default App;
