"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type NumericField = "java" | "python" | "sql" | "dsa" | "communication" | "projects" | "certifications";
const FIELDS: NumericField[] = ["java", "python", "sql", "dsa", "communication", "projects", "certifications"];

export interface SuggestionRow {
  id: string;
  companyId: string;
  company: { id: string; name: string };
  // Plain string on the Prisma model (not a DB enum) — narrowed defensively below.
  source: string;
  java: number | null;
  python: number | null;
  sql: number | null;
  dsa: number | null;
  communication: number | null;
  projects: number | null;
  certifications: number | null;
  rationale: string;
  citationUrl: string | null;
  basedOnReports: number | null;
  createdAt: string | Date;
}

const SOURCE_LABEL: Record<string, string> = {
  MANUAL: "Manual",
  CROWDSOURCED: "Crowdsourced",
  AI_RESEARCH: "AI research",
  EXTERNAL_API: "External API",
};

const SOURCE_COLOR: Record<string, { bg: string; fg: string }> = {
  MANUAL: { bg: "var(--surface-3)", fg: "var(--muted)" },
  CROWDSOURCED: { bg: "var(--accent2-soft)", fg: "var(--accent2)" },
  AI_RESEARCH: { bg: "var(--accent-soft)", fg: "var(--accent)" },
  EXTERNAL_API: { bg: "var(--warn-soft)", fg: "var(--warn)" },
};
const DEFAULT_SOURCE_COLOR = { bg: "var(--surface-3)", fg: "var(--muted)" };

/** Diff view (only shows fields the suggestion actually proposes changing). */
function ProposedDiff({ suggestion, currentByCompany }: { suggestion: SuggestionRow; currentByCompany: Record<string, Record<string, number>> }) {
  const current = currentByCompany[suggestion.companyId];
  const changed = FIELDS.filter((f) => suggestion[f] !== null && suggestion[f] !== undefined);
  if (changed.length === 0) return <p className="empty-note">No numeric changes proposed.</p>;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="mono">
      {changed.map((f) => {
        const from = current?.[f];
        const to = suggestion[f] as number;
        const up = from !== undefined && to > from;
        const down = from !== undefined && to < from;
        return (
          <span
            key={f}
            style={{
              background: "var(--surface-2)",
              padding: "3px 8px",
              borderRadius: 6,
              fontSize: "0.72rem",
              color: up ? "var(--good)" : down ? "var(--critical)" : "var(--muted)",
            }}
          >
            {f}: {from ?? "?"} → <strong>{to}</strong>
          </span>
        );
      })}
    </div>
  );
}

export function SuggestionsPanel({
  suggestions,
  currentByCompany,
}: {
  suggestions: SuggestionRow[];
  currentByCompany: Record<string, Record<string, number>>;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [handledIds, setHandledIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function act(id: string, action: "approve" | "reject") {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/suggestions/${id}/${action}`, { method: "POST" });
    setBusyId(null);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? `Couldn't ${action} this suggestion.`);
      return;
    }
    setHandledIds((prev) => new Set(prev).add(id));
    router.refresh();
  }

  const visible = suggestions.filter((s) => !handledIds.has(s.id));

  if (visible.length === 0) {
    return (
      <div className="card card-pad">
        <div className="section-label" style={{ marginBottom: 6 }}>Benchmark suggestions</div>
        <p className="empty-note">No pending suggestions — benchmarks are all caught up.</p>
      </div>
    );
  }

  return (
    <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div className="section-label">Benchmark suggestions</div>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: "4px 0 0" }}>
          Proposed changes from manual notes, student interview reports, or AI research — nothing here
          touches a company's live numbers until you approve it.
        </p>
      </div>

      {error && (
        <div className="card" style={{ padding: 12, background: "var(--critical-soft)", color: "var(--critical)", fontSize: "0.8rem", fontWeight: 600 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {visible.map((s) => {
          const colors = SOURCE_COLOR[s.source] ?? DEFAULT_SOURCE_COLOR;
          return (
            <div key={s.id} className="card" style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{s.company.name}</span>
                    <span style={{ background: colors.bg, color: colors.fg, fontSize: "0.65rem", fontWeight: 800, padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                      {SOURCE_LABEL[s.source] ?? s.source}
                    </span>
                    {s.basedOnReports != null && (
                      <span style={{ fontSize: "0.7rem", color: "var(--faint)" }}>from {s.basedOnReports} report{s.basedOnReports === 1 ? "" : "s"}</span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: "0.82rem", lineHeight: 1.5 }}>{s.rationale}</p>
                  {s.citationUrl && (
                    <a href={s.citationUrl} target="_blank" rel="noreferrer" style={{ fontSize: "0.75rem", color: "var(--accent2)", fontWeight: 600 }}>
                      Source ↗
                    </a>
                  )}
                  <ProposedDiff suggestion={s} currentByCompany={currentByCompany} />
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button className="btn btn-ghost btn-sm" disabled={busyId === s.id} onClick={() => act(s.id, "reject")}>
                    Reject
                  </button>
                  <button className="btn btn-primary btn-sm" disabled={busyId === s.id} onClick={() => act(s.id, "approve")}>
                    {busyId === s.id ? "Working…" : "Approve"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
