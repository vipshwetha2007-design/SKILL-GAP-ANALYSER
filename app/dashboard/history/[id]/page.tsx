import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { DeleteReportButton } from "@/components/history/DeleteReportButton";
import { prisma } from "@/lib/prisma";
import type { GapEntry, Recommendation, RoadmapStep, StrengthEntry } from "@/lib/scoring";

export const dynamic = "force-dynamic";

function scoreColor(score: number) {
  if (score >= 70) return "var(--good)";
  if (score >= 50) return "var(--warn)";
  return "var(--critical)";
}

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) notFound();

  const strengths = ((report.strengths as any).items as StrengthEntry[]) || (report.strengths as unknown as StrengthEntry[]);
  
  const parsedGaps = report.gapDetails as any;
  const gaps = (Array.isArray(parsedGaps) ? parsedGaps : (parsedGaps.items || [])) as GapEntry[];
  const meta = Array.isArray(parsedGaps) ? null : parsedGaps.meta;

  const recommendations = ((report.recommendations as any).items as Recommendation[]) || (report.recommendations as unknown as Recommendation[]);
  const roadmap = ((report.roadmap as any).items as RoadmapStep[]) || (report.roadmap as unknown as RoadmapStep[]);

  const analysisModeLabel = meta?.analysisMode === "live" ? "Live Jobs" : "Benchmarks";
  const inputModeLabel = meta?.inputMode === "resume" ? "Resume Upload" : "Manual Entry";

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 820, margin: "0 auto", padding: "24px 16px 70px" }}>
        <Link href="/dashboard/history" style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }}>← Back to history</Link>

        <div className="card card-pad" style={{ marginTop: 14, marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: "1.15rem", fontWeight: 700 }}>{report.companyName}</h1>
            <p style={{ margin: "3px 0 0", fontSize: "0.8rem", color: "var(--muted)" }}>
              {report.studentName} · {new Date(report.createdAt).toLocaleString()}
            </p>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <span style={{ fontSize: "0.7rem", background: "var(--surface-3)", color: "var(--ink)", padding: "2px 8px", borderRadius: "4px", fontWeight: 600 }}>
                {analysisModeLabel}
              </span>
              <span style={{ fontSize: "0.7rem", background: "var(--surface-3)", color: "var(--ink)", padding: "2px 8px", borderRadius: "4px", fontWeight: 600 }}>
                {inputModeLabel}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="mono" style={{ fontWeight: 700, fontSize: "1.6rem", color: scoreColor(report.readinessScore) }}>
              {report.readinessScore.toFixed(1)}%
            </div>
            <DeleteReportButton id={report.id} />
          </div>
        </div>

        <div className="status-pill" style={{ background: "var(--surface-2)", marginBottom: 20 }}>
          {report.statusEmoji} {report.status}
        </div>

        <div className="two-col" style={{ marginBottom: 18 }}>
          <div className="card list-card card-pad">
            <h3 style={{ color: "var(--good)" }}>✓ Strengths</h3>
            {strengths.length === 0 ? (
              <div className="empty-note">None recorded.</div>
            ) : (
              <ul className="chip-list">
                {strengths.map((s) => (
                  <li className="chip" style={{ background: "var(--good-soft)" }} key={s.label}>
                    <span className="dot" style={{ background: "var(--good)" }} />
                    <span className="t">{s.label}</span>
                    <span className="m">{s.student}/{s.required}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card list-card card-pad">
            <h3 style={{ color: "var(--critical)" }}>△ Needs work</h3>
            {gaps.length === 0 ? (
              <div className="empty-note">None recorded.</div>
            ) : (
              <ul className="chip-list">
                {gaps.map((g) => (
                  <li className="chip" style={{ background: "var(--critical-soft)" }} key={g.label}>
                    <span className="dot" style={{ background: "var(--critical)" }} />
                    <span className="t">{g.label}</span>
                    <span className="m">need {g.required} · have {g.student} · gap {g.gap}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="card card-pad" style={{ marginBottom: 18 }}>
          <h3 style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 13 }}>💡 Recommendations</h3>
          <ul className="reco-list">
            {recommendations.map((r, i) => (
              <li className="reco-item" key={i}>
                <span className="reco-tag" style={{ background: "var(--surface-3)", color: "var(--ink)" }}>{r.tag}</span>
                <span className="reco-text">{r.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card" style={{ padding: "20px 22px", marginBottom: 18 }}>
          <h3 style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 16 }}>🗺 Roadmap</h3>
          <div className="timeline">
            {roadmap.map((step, idx) => (
              <div className={`tstep${step.final ? " final" : ""}`} key={idx}>
                <div className="rail"><div className="num">{step.month}</div></div>
                <div className="body">
                  <div className="m-label">Month {step.month}{step.tag ? ` · ${step.tag}` : ""}</div>
                  <div className="m-text">{step.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 4 }}>
          <pre className="mono" style={{ margin: 0, padding: "18px 20px", background: "var(--surface-2)", fontSize: "0.76rem", lineHeight: 1.65, whiteSpace: "pre", overflow: "auto" }}>
            {report.reportText}
          </pre>
        </div>
      </main>
    </>
  );
}
