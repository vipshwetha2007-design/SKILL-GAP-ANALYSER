"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";

interface HistoryDashboardProps {
  reports: any[];
}

function scoreColor(score: number) {
  if (score >= 70) return "var(--good)";
  if (score >= 50) return "var(--warn)";
  return "var(--critical)";
}

export function HistoryDashboard({ reports }: HistoryDashboardProps) {
  const [filterCompany, setFilterCompany] = useState<string>("All");
  const [filterMode, setFilterMode] = useState<string>("All");

  // Parse reports to extract meta smoothly
  const parsedReports = useMemo(() => {
    return reports.map(r => {
      let meta = null;
      let gaps = [];
      let strengths = [];
      
      if (r.gapDetails && typeof r.gapDetails === "object") {
        if (!Array.isArray(r.gapDetails) && r.gapDetails.meta) {
          meta = r.gapDetails.meta;
          gaps = r.gapDetails.items || [];
        } else {
          gaps = r.gapDetails;
        }
      }
      
      if (r.strengths && typeof r.strengths === "object") {
         if (!Array.isArray(r.strengths) && r.strengths.items) strengths = r.strengths.items;
         else strengths = r.strengths;
      }

      const analysisMode = meta?.analysisMode || "benchmark";
      const inputMode = meta?.inputMode || "manual";
      
      return {
        ...r,
        meta,
        gaps,
        strengths,
        analysisMode,
        inputMode
      };
    });
  }, [reports]);

  const companies = Array.from(new Set(parsedReports.map(r => r.companyName))).sort();

  const filtered = parsedReports.filter(r => {
    if (filterCompany !== "All" && r.companyName !== filterCompany) return false;
    if (filterMode !== "All" && r.analysisMode !== filterMode) return false;
    return true;
  });

  // Sort ascending for chart
  const chronological = [...filtered].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Summary stats
  const latestScore = chronological.length > 0 ? chronological[chronological.length - 1].readinessScore : null;
  const highestScore = chronological.length > 0 ? Math.max(...chronological.map(r => r.readinessScore)) : null;
  
  let recentImprovement = null;
  if (chronological.length >= 2) {
    const last = chronological[chronological.length - 1].readinessScore;
    const prev = chronological[chronological.length - 2].readinessScore;
    recentImprovement = last - prev;
  }

  if (reports.length === 0) {
    return (
      <div className="card card-pad" style={{ textAlign: "center", padding: "40px 20px" }}>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16 }}>
          No saved reports yet. Run an analysis and click <strong>Generate report</strong> to save your first one.
        </p>
        <Link href="/" className="btn btn-primary">Go to analyzer</Link>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        <div className="card card-pad">
          <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.03em" }}>Latest Score</div>
          <div className="mono" style={{ fontSize: "1.8rem", fontWeight: 700, color: latestScore !== null ? scoreColor(latestScore) : "var(--ink)" }}>
            {latestScore !== null ? `${latestScore.toFixed(1)}%` : "--"}
          </div>
        </div>
        <div className="card card-pad">
          <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.03em" }}>Analyses</div>
          <div className="mono" style={{ fontSize: "1.8rem", fontWeight: 700 }}>
            {filtered.length}
          </div>
        </div>
        <div className="card card-pad">
          <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.03em" }}>Highest Score</div>
          <div className="mono" style={{ fontSize: "1.8rem", fontWeight: 700, color: highestScore !== null ? scoreColor(highestScore) : "var(--ink)" }}>
            {highestScore !== null ? `${highestScore.toFixed(1)}%` : "--"}
          </div>
        </div>
        <div className="card card-pad">
          <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.03em" }}>Recent Change</div>
          <div className="mono" style={{ fontSize: "1.8rem", fontWeight: 700, color: recentImprovement && recentImprovement > 0 ? "var(--good)" : (recentImprovement && recentImprovement < 0 ? "var(--critical)" : "var(--ink)") }}>
            {recentImprovement !== null ? `${recentImprovement > 0 ? "+" : ""}${recentImprovement.toFixed(1)}%` : "--"}
          </div>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: "24px", overflow: "hidden" }}>
        <h3 style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "16px" }}>Readiness Progress</h3>
        {chronological.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
            Not enough data to display a chart.
          </div>
        ) : chronological.length === 1 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
            A single analysis recorded. Complete another to see your progress chart!
          </div>
        ) : (
          <div style={{ height: "180px", position: "relative", display: "flex", alignItems: "flex-end", gap: "2%", paddingBottom: "20px" }}>
            {/* Simple CSS-based bar/line abstraction for the chart */}
            {chronological.map((r, i) => {
              const heightPct = Math.max(r.readinessScore, 5); // min height for visibility
              return (
                <div key={r.id} style={{ flex: 1, height: "100%", position: "relative", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
                  <div className="mono" style={{ fontSize: "0.6rem", color: "var(--muted)", marginBottom: "4px" }}>{r.readinessScore.toFixed(0)}</div>
                  <div style={{ width: "100%", maxWidth: "40px", height: `${heightPct}%`, background: scoreColor(r.readinessScore), opacity: 0.8, borderRadius: "4px 4px 0 0" }} />
                  <div style={{ position: "absolute", bottom: "-20px", fontSize: "0.6rem", color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%", textAlign: "center" }}>
                    {new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <select className="input" style={{ width: "auto", padding: "6px 10px", fontSize: "0.8rem" }} value={filterCompany} onChange={e => setFilterCompany(e.target.value)}>
          <option value="All">All Companies</option>
          {companies.map(c => <option key={c} value={c}>{c as string}</option>)}
        </select>
        <select className="input" style={{ width: "auto", padding: "6px 10px", fontSize: "0.8rem" }} value={filterMode} onChange={e => setFilterMode(e.target.value)}>
          <option value="All">All Modes</option>
          <option value="benchmark">Benchmarks</option>
          <option value="live">Live Jobs</option>
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filtered.length === 0 ? (
          <div className="card card-pad" style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>No analyses match these filters.</div>
        ) : (
          filtered.slice().reverse().map((r) => (
            <div key={r.id} className="card" style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: "1.05rem", margin: "0 0 4px 0" }}>{r.companyName}</h3>
                  <div style={{ fontSize: "0.76rem", color: "var(--muted)" }}>
                    {new Date(r.createdAt).toLocaleString()} · {r.studentName}
                  </div>
                  <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                    <span style={{ fontSize: "0.65rem", background: "var(--surface-3)", color: "var(--ink)", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                      {r.analysisMode === "live" ? "Live Jobs" : "Benchmark"}
                    </span>
                    <span style={{ fontSize: "0.65rem", background: "var(--surface-3)", color: "var(--ink)", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                      {r.inputMode === "resume" ? "Resume Upload" : "Manual Entry"}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="mono" style={{ fontWeight: 700, fontSize: "1.6rem", color: scoreColor(r.readinessScore), lineHeight: 1 }}>
                    {r.readinessScore.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: "0.75rem", marginTop: "4px" }}>{r.statusEmoji} {r.status}</div>
                </div>
              </div>
              
              {(r.strengths.length > 0 || r.gaps.length > 0) && (
                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginTop: "4px", padding: "10px", background: "var(--surface-2)", borderRadius: "8px" }}>
                  {r.strengths.length > 0 && (
                    <div style={{ flex: 1, minWidth: "160px" }}>
                      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--good)", textTransform: "uppercase", marginBottom: "6px" }}>Strengths</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                        {r.strengths.slice(0, 3).map((s: any) => s.label).join(", ")}{r.strengths.length > 3 ? "..." : ""}
                      </div>
                    </div>
                  )}
                  {r.gaps.length > 0 && (
                    <div style={{ flex: 1, minWidth: "160px" }}>
                      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--critical)", textTransform: "uppercase", marginBottom: "6px" }}>Critical Gaps</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                        {r.gaps.slice(0, 3).map((g: any) => g.label).join(", ")}{r.gaps.length > 3 ? "..." : ""}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div style={{ marginTop: "4px", display: "flex", justifyContent: "flex-end" }}>
                <Link href={`/dashboard/history/${r.id}`} className="btn btn-primary btn-sm">
                  View full report →
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
