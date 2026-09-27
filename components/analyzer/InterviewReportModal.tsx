"use client";

import { useState } from "react";

type SkillKey = "java" | "python" | "sql" | "dsa" | "communication";
const SKILLS: { key: SkillKey; label: string }[] = [
  { key: "java", label: "Java" },
  { key: "python", label: "Python" },
  { key: "sql", label: "SQL" },
  { key: "dsa", label: "DSA" },
  { key: "communication", label: "Communication" },
];

const OUTCOMES = [
  { value: "OFFER", label: "Got an offer" },
  { value: "REJECTED", label: "Rejected" },
  { value: "NO_RESPONSE", label: "No response" },
  { value: "IN_PROGRESS", label: "Still in process" },
];

/**
 * A small modal any signed-in student can use to log what a real interview
 * actually tested. This feeds the "crowdsourced" side of the benchmark
 * freshness system: an admin later aggregates these into a suggestion that
 * still needs their approval before it changes anything students see.
 */
export function InterviewReportModal({
  companyId,
  companyName,
  onClose,
  onSubmitted,
}: {
  companyId: string;
  companyName: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [role, setRole] = useState("");
  const [outcome, setOutcome] = useState("OFFER");
  const [difficulty, setDifficulty] = useState(3);
  const [skillsTested, setSkillsTested] = useState<Set<SkillKey>>(new Set());
  const [perceived, setPerceived] = useState<Record<SkillKey, number>>({
    java: 6,
    python: 6,
    sql: 6,
    dsa: 6,
    communication: 6,
  });
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSkill(key: SkillKey) {
    setSkillsTested((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (skillsTested.size === 0) {
      setError("Pick at least one skill that actually came up in the interview.");
      return;
    }
    setBusy(true);
    const perceivedFields: Record<string, number | null> = {
      perceivedJava: null,
      perceivedPython: null,
      perceivedSql: null,
      perceivedDsa: null,
      perceivedCommunication: null,
    };
    const fieldByKey: Record<SkillKey, string> = {
      java: "perceivedJava",
      python: "perceivedPython",
      sql: "perceivedSql",
      dsa: "perceivedDsa",
      communication: "perceivedCommunication",
    };
    for (const key of skillsTested) {
      perceivedFields[fieldByKey[key]] = perceived[key];
    }

    const res = await fetch(`/api/companies/${companyId}/interview-reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: role || undefined,
        outcome,
        skillsTested: Array.from(skillsTested),
        ...perceivedFields,
        difficulty,
        notes: notes || undefined,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.message ?? json.error ?? "Couldn't submit your report.");
      return;
    }
    onSubmitted();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20, 24, 26, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ maxWidth: 520, width: "100%", maxHeight: "88vh", overflow: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "18px 20px 0" }}>
          <div className="section-label">Share your interview experience</div>
          <h2 style={{ fontSize: "1.02rem", fontWeight: 700, margin: "4px 0 2px" }}>{companyName}</h2>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: 0 }}>
            This won&apos;t change {companyName}&apos;s benchmark by itself — an admin reviews aggregated
            reports before anything updates.
          </p>
        </div>

        <form onSubmit={submit} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          {error && (
            <div className="card" style={{ padding: 12, background: "var(--critical-soft)", color: "var(--critical)", fontSize: "0.8rem", fontWeight: 600 }}>
              {error}
            </div>
          )}

          <div className="field">
            <label>Role interviewed for (optional)</label>
            <input className="input" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. SDE Intern" />
          </div>

          <div className="field">
            <label>Outcome</label>
            <select className="input" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
              {OUTCOMES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Which skills actually came up?</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {SKILLS.map((s) => {
                const active = skillsTested.has(s.key);
                return (
                  <button
                    type="button"
                    key={s.key}
                    onClick={() => toggleSkill(s.key)}
                    className={active ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {Array.from(skillsTested).map((key) => (
            <div className="field" key={key}>
              <label style={{ textTransform: "capitalize" }}>
                Real bar for {key} (0-10) <span style={{ fontWeight: 400, color: "var(--faint)" }}>— based on the questions/feedback</span>
              </label>
              <input
                type="number"
                min={0}
                max={10}
                className="input"
                value={perceived[key]}
                onChange={(e) => setPerceived((p) => ({ ...p, [key]: Number(e.target.value) }))}
              />
            </div>
          ))}

          <div className="field">
            <label>Overall difficulty (1 = easier than expected, 5 = brutal)</label>
            <input
              type="range"
              min={1}
              max={5}
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
            />
          </div>

          <div className="field">
            <label>Notes (optional)</label>
            <textarea
              className="input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything specific that surprised you"
            />
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              {busy ? "Submitting…" : "Submit report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
