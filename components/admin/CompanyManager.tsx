"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CompanyRequirements } from "@/lib/scoring";

type Company = CompanyRequirements & { id: string; sourceUrl: string | null; lastVerifiedAt: Date | string | null };
type NumericField = "java" | "python" | "sql" | "dsa" | "communication" | "projects" | "certifications";

const FIELDS: NumericField[] = ["java", "python", "sql", "dsa", "communication", "projects", "certifications"];

const BLANK: Omit<Company, "id" | "lastVerifiedAt"> = { name: "", description: "", java: 6, python: 6, sql: 6, dsa: 6, communication: 6, projects: 2, certifications: 2, sourceUrl: null };

function freshnessLabel(lastVerifiedAt: Date | string | null): { text: string; stale: boolean } {
  if (!lastVerifiedAt) return { text: "Never verified", stale: true };
  const days = Math.floor((Date.now() - new Date(lastVerifiedAt).getTime()) / 86_400_000);
  if (days < 1) return { text: "Verified today", stale: false };
  if (days < 90) return { text: `Verified ${days}d ago`, stale: false };
  return { text: `Verified ${days}d ago — getting stale`, stale: true };
}

export function CompanyManager({ initial }: { initial: Company[] }) {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>(initial);
  const [draft, setDraft] = useState(BLANK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Company | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState<Record<string, string>>({});
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  async function generateFromReports(id: string) {
    setActionBusy(id + ":reports");
    setActionMsg((m) => ({ ...m, [id]: "" }));
    const res = await fetch(`/api/companies/${id}/suggestions/from-reports`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setActionBusy(null);
    setActionMsg((m) => ({ ...m, [id]: res.ok ? "Suggestion created from interview reports — see below." : json.error ?? "Couldn't create a suggestion." }));
    if (res.ok) router.refresh();
  }

  async function researchWithAi(id: string) {
    setActionBusy(id + ":ai");
    setActionMsg((m) => ({ ...m, [id]: "" }));
    const res = await fetch(`/api/companies/${id}/suggestions/research`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setActionBusy(null);
    if (res.ok) {
      setActionMsg((m) => ({ ...m, [id]: "AI suggestion created — see below." }));
      router.refresh();
    } else if (json.error === "not_configured") {
      setActionMsg((m) => ({ ...m, [id]: "AI research needs an ANTHROPIC_API_KEY set on the server first." }));
    } else {
      setActionMsg((m) => ({ ...m, [id]: json.error ?? "AI research failed." }));
    }
  }

  async function checkJobPostings(id: string) {
    setActionBusy(id + ":jobs");
    setActionMsg((m) => ({ ...m, [id]: "" }));
    const res = await fetch(`/api/companies/${id}/suggestions/external`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setActionBusy(null);
    if (res.ok) {
      setActionMsg((m) => ({ ...m, [id]: "Suggestion created from current job postings — see below." }));
      router.refresh();
    } else if (json.error === "not_configured") {
      setActionMsg((m) => ({ ...m, [id]: "Job postings check needs a RAPIDAPI_KEY set on the server first." }));
    } else {
      setActionMsg((m) => ({ ...m, [id]: json.error ?? "Job postings check failed." }));
    }
  }

  async function addCompany(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Couldn't create company.");
      return;
    }
    setCompanies((prev) => [...prev, json.company].sort((a, b) => a.name.localeCompare(b.name)));
    setDraft(BLANK);
  }

  function startEdit(c: Company) {
    setEditingId(c.id);
    setEditDraft(c);
    setError(null);
  }

  async function saveEdit() {
    if (!editDraft) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/companies/${editDraft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editDraft),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Couldn't save changes.");
      return;
    }
    setCompanies((prev) => prev.map((c) => (c.id === editDraft.id ? json.company : c)));
    setEditingId(null);
    setEditDraft(null);
  }

  async function removeCompany(id: string) {
    if (!confirm("Delete this company? Past saved reports keep a snapshot, but students can no longer analyze against it.")) return;
    setBusy(true);
    const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) setCompanies((prev) => prev.filter((c) => c.id !== id));
    else setError("Couldn't delete company.");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {error && (
        <div className="card" style={{ padding: 14, background: "var(--critical-soft)", color: "var(--critical)", fontSize: "0.82rem", fontWeight: 600 }}>
          {error}
        </div>
      )}

      <div className="card card-pad">
        <div className="section-label" style={{ marginBottom: 12 }}>Add a company</div>
        <form onSubmit={addCompany} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Name</label>
            <input className="input" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Description</label>
            <input className="input" required value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          {FIELDS.map((f) => (
            <div className="field" key={f}>
              <label style={{ textTransform: "capitalize" }}>{f}</label>
              <input
                type="number"
                min={0}
                max={f === "projects" || f === "certifications" ? 50 : 10}
                className="input"
                value={draft[f] as number}
                onChange={(e) => setDraft({ ...draft, [f]: Number(e.target.value) })}
              />
            </div>
          ))}
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Source URL (optional)</label>
            <input
              className="input"
              type="url"
              placeholder="Where these numbers come from — a careers page, article, etc."
              value={draft.sourceUrl ?? ""}
              onChange={(e) => setDraft({ ...draft, sourceUrl: e.target.value || null })}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Adding…" : "Add company"}</button>
          </div>
        </form>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {companies.map((c) => {
          const editing = editingId === c.id;
          const row = editing && editDraft ? editDraft : c;
          return (
            <div className="card card-pad" key={c.id}>
              {editing ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <label>Name</label>
                    <input className="input" value={row.name} onChange={(e) => setEditDraft({ ...row, name: e.target.value })} />
                  </div>
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <label>Description</label>
                    <input className="input" value={row.description} onChange={(e) => setEditDraft({ ...row, description: e.target.value })} />
                  </div>
                  {FIELDS.map((f) => (
                    <div className="field" key={f}>
                      <label style={{ textTransform: "capitalize" }}>{f}</label>
                      <input
                        type="number"
                        min={0}
                        max={f === "projects" || f === "certifications" ? 50 : 10}
                        className="input"
                        value={row[f] as number}
                        onChange={(e) => setEditDraft({ ...row, [f]: Number(e.target.value) })}
                      />
                    </div>
                  ))}
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <label>Source URL (optional)</label>
                    <input
                      className="input"
                      type="url"
                      value={row.sourceUrl ?? ""}
                      onChange={(e) => setEditDraft({ ...row, sourceUrl: e.target.value || null })}
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={busy}>Save</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditingId(null); setEditDraft(null); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>{c.name}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", margin: "3px 0 8px", maxWidth: 480 }}>{c.description}</div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: "0.72rem" }} className="mono">
                        {FIELDS.map((f) => (
                          <span key={f} style={{ background: "var(--surface-2)", padding: "3px 8px", borderRadius: 6, color: "var(--muted)" }}>
                            {f}: <strong style={{ color: "var(--ink)" }}>{c[f]}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(c)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => removeCompany(c.id)} disabled={busy}>Delete</button>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.72rem", color: freshnessLabel(c.lastVerifiedAt).stale ? "var(--warn)" : "var(--faint)" }}>
                      <span>{freshnessLabel(c.lastVerifiedAt).text}</span>
                      {c.sourceUrl && (
                        <a href={c.sourceUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent2)", fontWeight: 600 }}>
                          Source ↗
                        </a>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={actionBusy === c.id + ":reports"}
                        onClick={() => generateFromReports(c.id)}
                      >
                        {actionBusy === c.id + ":reports" ? "Aggregating…" : "Generate from interview reports"}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={actionBusy === c.id + ":ai"}
                        onClick={() => researchWithAi(c.id)}
                      >
                        {actionBusy === c.id + ":ai" ? "Researching…" : "Research with AI"}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={actionBusy === c.id + ":jobs"}
                        onClick={() => checkJobPostings(c.id)}
                      >
                        {actionBusy === c.id + ":jobs" ? "Checking…" : "Check job postings"}
                      </button>
                    </div>
                  </div>
                  {actionMsg[c.id] && (
                    <p style={{ margin: 0, fontSize: "0.74rem", color: "var(--muted)" }}>{actionMsg[c.id]}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
