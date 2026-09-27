"use client";

import { useMemo, useRef, useState } from "react";
import type { CompanyRequirements } from "@/lib/scoring";
import { analyze, generateReportText, sanitizeStudentInput } from "@/lib/scoring";
import { ProfileForm } from "./ProfileForm";
import { ResumeUpload } from "./ResumeUpload";
import { ScoreGauge } from "./ScoreGauge";
import { SkillBars } from "./SkillBars";
import { StrengthsGaps } from "./StrengthsGaps";
import { Recommendations } from "./Recommendations";
import { Roadmap } from "./Roadmap";
import { ReportPanel } from "./ReportPanel";
import { InterviewReportModal } from "./InterviewReportModal";

type Skill = "java" | "python" | "sql" | "dsa" | "communication";

export function Analyzer({ companies, userName }: { companies: CompanyRequirements[]; userName: string }) {
  const [inputMode, setInputMode] = useState<"manual" | "resume">("manual");
  const [name, setName] = useState(userName);
  const [nameInvalid, setNameInvalid] = useState(false);
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [skills, setSkills] = useState<Record<Skill, number>>({ java: 8, python: 6, sql: 7, dsa: 6, communication: 8 });
  const [projects, setProjects] = useState(3);
  const [certifications, setCertifications] = useState(1);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [analysisMode, setAnalysisMode] = useState<"benchmark" | "live">("benchmark");
  const [liveJobData, setLiveJobData] = useState<{ jobsAnalyzed: number; requiredSkills: { name: string; percentage: number }[] } | null>(null);
  const [liveJobsLoading, setLiveJobsLoading] = useState(false);

  const [reportText, setReportText] = useState("");
  const [reportMeta, setReportMeta] = useState("Not generated yet");
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const [showInterviewModal, setShowInterviewModal] = useState(false);

  function toast(msg: string) {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2200);
  }

  const company = companies.find((c) => c.id === companyId) ?? companies[0];

  const student = useMemo(
    () => sanitizeStudentInput({ name, ...skills, projects, certifications, extractedSkills }),
    [name, skills, projects, certifications, extractedSkills]
  );

  const fetchLiveJobs = async (compName: string) => {
    setLiveJobsLoading(true);
    try {
      const res = await fetch(`/api/analyze-live-jobs?company=${encodeURIComponent(compName)}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to fetch");
      }
      const data = await res.json();
      if (data.jobsAnalyzed > 0) {
        setLiveJobData(data);
      } else {
        setLiveJobData(null);
        toast("No live jobs found, falling back to benchmarks.");
        setAnalysisMode("benchmark");
      }
    } catch (e: any) {
      setLiveJobData(null);
      const msg = e.message?.toLowerCase().includes("time") 
        ? "Live jobs timed out. Falling back to benchmarks (you can retry)." 
        : "Live job API failed. Falling back to benchmarks.";
      toast(msg);
      setAnalysisMode("benchmark");
    } finally {
      setLiveJobsLoading(false);
    }
  };

  const handleAnalysisModeChange = (mode: "benchmark" | "live") => {
    setAnalysisMode(mode);
    if (mode === "live" && company) {
      fetchLiveJobs(company.name);
    } else {
      setLiveJobData(null);
    }
  };

  const result = useMemo(() => (company ? analyze(student, company, analysisMode === "live" && liveJobData ? liveJobData : undefined) : null), [student, company, analysisMode, liveJobData]);

  function onSkillChange(key: Skill, value: number) {
    setSkills((s) => ({ ...s, [key]: value }));
  }

  function resetAll() {
    setName("");
    setNameInvalid(false);
    setCompanyId(companies[0]?.id ?? "");
    setSkills({ java: 0, python: 0, sql: 0, dsa: 0, communication: 0 });
    setProjects(0);
    setCertifications(0);
    setExtractedSkills([]);
    setReportText("");
    setReportMeta("Not generated yet");
    toast("Cleared");
  }

  function handleConfirmSkills(candidateName: string, foundSkills: string[]) {
    setName(candidateName);
    const sl = foundSkills.map((sk) => sk.toLowerCase());

    let j = 0, p = 0, s = 0, d = 0, c = 0, proj = 0, certs = 0;

    if (sl.some(sk => ["java", "spring boot", "c#", "c++"].includes(sk))) j = 8;
    else if (sl.some(sk => ["javascript", "typescript", "node.js"].includes(sk))) j = 6;

    if (sl.some(sk => ["python", "machine learning", "django"].includes(sk))) p = 8;

    if (sl.some(sk => ["sql", "postgresql", "mysql", "mongodb", "redis"].includes(sk))) s = 8;

    if (sl.some(sk => ["data structures & algorithms", "c++"].includes(sk))) d = 7;
    else if (j >= 8 || p >= 8) d = 5;

    if (sl.some(sk => ["communication", "agile", "leadership"].includes(sk))) c = 8;
    else c = 6;

    if (sl.some(sk => ["aws", "azure", "gcp"].includes(sk))) certs = 1;

    if (sl.some(sk => ["react", "node.js", "docker", "kubernetes"].includes(sk))) proj = 2;

    setSkills({ java: j, python: p, sql: s, dsa: d, communication: c });
    setProjects(proj);
    setCertifications(certs);
    setExtractedSkills(foundSkills);

    if (analysisMode === "live" && company) {
      fetchLiveJobs(company.name);
    }

    setInputMode("manual");
    toast("Skills applied. Adjust sliders and generate your report.");
  }

  async function generateReport() {
    if (!name.trim()) {
      setNameInvalid(true);
      toast("Enter your name to generate a report");
      return;
    }
    if (!company) return;
    setNameInvalid(false);
    setSaving(true);
    try {
      const payload = {
        companyId: company.id,
        ...student,
        analysisMode,
        inputMode,
        liveJobData: analysisMode === "live" ? liveJobData : undefined,
      };

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast(json.error ?? "Couldn't save the report.");
        // Fall back to a client-side preview so the student still sees output.
        if (result) setReportText(generateReportText(student, company, result));
        setReportMeta("Preview only — not saved (" + (json.error ?? "server error") + ")");
      } else if (json.saved === false) {
        // No database configured — the analysis still ran, it just wasn't persisted.
        setReportText(json.reportText);
        setReportMeta("Preview only — no database configured, so nothing is saved to history");
        toast("Report generated (not saved — no database configured)");
      } else {
        setReportText(json.reportText);
        setReportMeta("Saved to your history · " + new Date(json.report.createdAt).toLocaleString());
        toast("Report saved");
      }
    } catch {
      if (result) setReportText(generateReportText(student, company, result));
      setReportMeta("Preview only — couldn't reach the server");
      toast("Network error — showing a local preview instead");
    } finally {
      setSaving(false);
      reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  if (!company || !result) {
    return (
      <div className="card card-pad" style={{ maxWidth: 640, margin: "40px auto" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 8 }}>No companies yet</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
          The company benchmark table is empty. Ask an admin to seed or add companies from the Companies screen.
        </p>
      </div>
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar no-print">
        <div className="card card-pad" style={{ padding: "6px", display: "flex", gap: "6px", marginBottom: "12px" }}>
          <button
            type="button"
            className={`btn ${inputMode === "manual" ? "btn-primary" : "btn-ghost"}`}
            style={{ flex: 1, padding: "8px" }}
            onClick={() => setInputMode("manual")}
          >
            Manual Entry
          </button>
          <button
            type="button"
            className={`btn ${inputMode === "resume" ? "btn-primary" : "btn-ghost"}`}
            style={{ flex: 1, padding: "8px" }}
            onClick={() => setInputMode("resume")}
          >
            Upload Resume
          </button>
        </div>

        {inputMode === "manual" ? (
          <ProfileForm
            name={name}
            onNameChange={setName}
            nameInvalid={nameInvalid}
            companies={companies}
            companyId={companyId}
            onCompanyChange={(id) => {
              setCompanyId(id);
              const c = companies.find(comp => comp.id === id);
              if (analysisMode === "live" && c) fetchLiveJobs(c.name);
            }}
            skills={skills}
            onSkillChange={onSkillChange}
            projects={projects}
            certifications={certifications}
            onProjectsChange={setProjects}
            onCertificationsChange={setCertifications}
            onReset={resetAll}
            onGenerate={generateReport}
            saving={saving}
          />
        ) : (
          <ResumeUpload
            companies={companies}
            companyId={companyId}
            onCompanyChange={setCompanyId}
            onConfirmSkills={handleConfirmSkills}
          />
        )}
      </aside>

      <main className="main-col" style={{ opacity: liveJobsLoading ? 0.6 : 1, transition: "opacity 0.3s ease", pointerEvents: liveJobsLoading ? "none" : "auto" }}>
        <div className="card profile-strip">
          <div className="who">
            <div className="avatar">{name ? name.charAt(0).toUpperCase() : "?"}</div>
            <div>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, lineHeight: 1.1 }}>{name || "Student Profile"}</h2>
              <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 500 }}>
                Targeting <strong style={{ color: "var(--ink)" }}>{company.name}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", background: "var(--surface-2)", padding: "4px", borderRadius: "8px", alignItems: "center" }}>
            <button
              onClick={() => handleAnalysisModeChange("benchmark")}
              className={`btn btn-sm ${analysisMode === "benchmark" ? "btn-primary" : ""}`}
              style={{ background: analysisMode === "benchmark" ? "var(--accent)" : "transparent", color: analysisMode === "benchmark" ? "var(--accent-ink)" : "var(--ink)", boxShadow: "none", border: "none" }}
            >
              Company Benchmarks
            </button>
            <button
              onClick={() => handleAnalysisModeChange("live")}
              className={`btn btn-sm ${analysisMode === "live" ? "btn-primary" : ""}`}
              style={{ background: analysisMode === "live" ? "var(--accent)" : "transparent", color: analysisMode === "live" ? "var(--accent-ink)" : "var(--ink)", boxShadow: "none", border: "none" }}
              disabled={liveJobsLoading}
            >
              {liveJobsLoading ? "Fetching..." : "Live Jobs"}
            </button>
          </div>
        </div>

        <div className="summary-grid">
          <div className="card stat-tile">
            <div className="n" style={{ color: result.readinessScore >= 70 ? "var(--good)" : result.readinessScore >= 50 ? "var(--warn)" : "var(--critical)" }}>
              {result.readinessScore.toFixed(1)}%
            </div>
            <div className="l">Readiness score</div>
          </div>
          <div className="card stat-tile">
            <div className="n">
              {result.strengths.length} / {result.dims.length}
            </div>
            <div className="l">Skills at/above bar</div>
          </div>
          <div className="card stat-tile">
            <div className="n">
              {result.missingSkills.length} / {result.dims.length}
            </div>
            <div className="l">Skills to close</div>
          </div>
          <div className="card stat-tile">
            <div className="n">
              {projects} / {company.projects}
            </div>
            <div className="l">Projects vs required</div>
          </div>
        </div>

        <div className="score-chart-row">
          <ScoreGauge score={result.readinessScore} status={result.status} statusEmoji={result.statusEmoji} companyName={company.name} />
          <SkillBars dims={result.dims} />
        </div>

        <StrengthsGaps strengths={result.strengths} gaps={result.gapDetails} total={result.dims.length} />

        {result.liveJobInsights && (
          <div className="card list-card" style={{ padding: "18px 20px", marginTop: "18px" }}>
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 15, height: 15 }}>
                <path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" />
                <polyline points="21 3 14 10 10 6 3 13" />
                <polyline points="21 3 21 9" />
                <line x1="16" y1="3" x2="21" y2="3" />
              </svg>
              Live Job Insights
              <span className="count" style={{ marginLeft: "auto", background: "var(--accent-soft)", color: "var(--accent)", padding: "2px 8px", borderRadius: "99px", fontSize: "0.72rem", fontFamily: "'IBM Plex Mono', monospace" }}>
                {result.liveJobInsights.jobsAnalyzed} postings
              </span>
            </h3>
            <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "16px", fontStyle: "italic", lineHeight: 1.4 }}>
              Current live job requirements dynamically matched against your skills.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
              {result.liveJobInsights.criticalGaps.length > 0 && (
                <div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--critical)", marginBottom: "8px", letterSpacing: "0.03em" }}>Critical Gaps (&gt;40%)</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {result.liveJobInsights.criticalGaps.map((s) => (
                      <span key={s} style={{ background: "var(--critical-soft)", color: "var(--critical)", padding: "4px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600 }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.liveJobInsights.needsImprovement.length > 0 && (
                <div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--warn)", marginBottom: "8px", letterSpacing: "0.03em" }}>Needs Improvement (20-40%)</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {result.liveJobInsights.needsImprovement.map((s) => (
                      <span key={s} style={{ background: "var(--warn-soft)", color: "var(--warn)", padding: "4px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600 }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.liveJobInsights.matched.length > 0 && (
                <div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--good)", marginBottom: "8px", letterSpacing: "0.03em" }}>Matched</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {result.liveJobInsights.matched.map((s) => (
                      <span key={s} style={{ background: "var(--good-soft)", color: "var(--good)", padding: "4px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600 }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <Recommendations items={result.recommendations} />
        <Roadmap steps={result.roadmap} />

        <div className="card card-pad" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>Interviewed at {company.name} recently?</div>
            <p style={{ margin: "3px 0 0", fontSize: "0.78rem", color: "var(--muted)" }}>
              Share what was actually tested — it helps keep this benchmark reflecting real hiring bars, not guesses.
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowInterviewModal(true)}>
            Share interview experience
          </button>
        </div>

        <div ref={reportRef}>
          <ReportPanel reportText={reportText} meta={reportMeta} onToast={toast} />
        </div>
      </main>

      {showInterviewModal && (
        <InterviewReportModal
          companyId={company.id ?? ""}
          companyName={company.name}
          onClose={() => setShowInterviewModal(false)}
          onSubmitted={() => {
            setShowInterviewModal(false);
            toast("Thanks — your interview report was submitted");
          }}
        />
      )}

      <div className={`toast${toastMsg ? " show" : ""}`}>{toastMsg}</div>
    </div>
  );
}
