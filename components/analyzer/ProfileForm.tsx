"use client";

import type { CompanyRequirements } from "@/lib/scoring";

type Skill = "java" | "python" | "sql" | "dsa" | "communication";

const SLIDER_FIELDS: { key: Skill; label: string; hint: string }[] = [
  { key: "java", label: "Java", hint: "0 = never used · 10 = Spring / enterprise-grade expert" },
  { key: "python", label: "Python", hint: "0 = none · 10 = ML/AI, Django/Flask fluency" },
  { key: "sql", label: "SQL", hint: "0 = none · 10 = window functions, query tuning" },
  { key: "dsa", label: "DSA", hint: "0 = none · 10 = hard LeetCode in O(n log n)" },
  { key: "communication", label: "Communication", hint: "0 = poor · 10 = HR-interview ready presenter" },
];

export function ProfileForm({
  name,
  onNameChange,
  nameInvalid,
  companies,
  companyId,
  onCompanyChange,
  skills,
  onSkillChange,
  projects,
  certifications,
  onProjectsChange,
  onCertificationsChange,
  onReset,
  onGenerate,
  saving,
}: {
  name: string;
  onNameChange: (v: string) => void;
  nameInvalid: boolean;
  companies: CompanyRequirements[];
  companyId: string;
  onCompanyChange: (id: string) => void;
  skills: Record<Skill, number>;
  onSkillChange: (key: Skill, value: number) => void;
  projects: number;
  certifications: number;
  onProjectsChange: (v: number) => void;
  onCertificationsChange: (v: number) => void;
  onReset: () => void;
  onGenerate: () => void;
  saving: boolean;
}) {
  const selected = companies.find((c) => c.id === companyId);

  return (
    <>
      <details className="card" style={{ padding: "16px 18px" }}>
        <summary style={{ cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", justifyContent: "space-between", fontWeight: 600, fontSize: "0.86rem" }}>
          📖 How this works
        </summary>
        <ol style={{ margin: "12px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
          {[
            "Pick the company you're aiming for.",
            "Rate five core skills from 0 (none) to 10 (expert) — the dashboard updates live.",
            "Add how many projects you've shipped and certifications you hold.",
            "Read your readiness score, gaps and roadmap on the right.",
            "Click Generate report to save this analysis to your history.",
          ].map((t, i) => (
            <li key={i} style={{ display: "flex", gap: 9, fontSize: "0.79rem", color: "var(--muted)", lineHeight: 1.4 }}>
              <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: "50%", background: "var(--accent2-soft)", color: "var(--accent2)", fontSize: "0.66rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                {i + 1}
              </span>
              {t}
            </li>
          ))}
        </ol>
      </details>

      <div className="card card-pad">
        <div className="section-label" style={{ marginBottom: 12 }}>Student profile</div>
        <div className="field" style={{ marginBottom: 14 }}>
          <label htmlFor="txtName">Full name</label>
          <input
            id="txtName"
            type="text"
            className={`input${nameInvalid ? " invalid" : ""}`}
            placeholder="e.g. Aditya Rao"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="cmbCompany">Dream company</label>
          <select id="cmbCompany" className="input" value={companyId} onChange={(e) => onCompanyChange(e.target.value)}>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {selected && (
            <div style={{ fontSize: "0.73rem", color: "var(--accent2)", fontStyle: "italic", lineHeight: 1.4, marginTop: 2 }}>{selected.description}</div>
          )}
        </div>
      </div>

      <div className="card card-pad">
        <div className="section-label" style={{ marginBottom: 14 }}>
          Technical skills <span style={{ textTransform: "none", fontWeight: 400, color: "var(--faint)" }}>— rate 0–10</span>
        </div>
        {SLIDER_FIELDS.map((f) => (
          <div className="skill-row" key={f.key}>
            <div className="row-top">
              <span className="name">{f.label}</span>
              <span className="val">{skills[f.key]}</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={skills[f.key]}
              style={{ ["--fill" as string]: `${(skills[f.key] / 10) * 100}%` }}
              onChange={(e) => onSkillChange(f.key, Number(e.target.value))}
            />
            <div className="example">{f.hint}</div>
          </div>
        ))}
      </div>

      <div className="card card-pad">
        <div className="section-label" style={{ marginBottom: 14 }}>Experience</div>
        <div className="field" style={{ marginBottom: 14 }}>
          <label htmlFor="numProjects">
            Projects built <span style={{ fontWeight: 400, color: "var(--faint)", fontSize: "0.7rem" }}>GitHub / capstone / open-source</span>
          </label>
          <div className="num-stepper">
            <button type="button" onClick={() => onProjectsChange(Math.max(0, projects - 1))} aria-label="Decrease projects">−</button>
            <input
              id="numProjects"
              type="number"
              min={0}
              max={50}
              value={projects}
              onChange={(e) => onProjectsChange(Math.max(0, Math.min(50, Number(e.target.value) || 0)))}
            />
            <button type="button" onClick={() => onProjectsChange(Math.min(50, projects + 1))} aria-label="Increase projects">+</button>
          </div>
        </div>
        <div className="field">
          <label htmlFor="numCerts">
            Certifications <span style={{ fontWeight: 400, color: "var(--faint)", fontSize: "0.7rem" }}>AWS / Oracle / GCP / Azure…</span>
          </label>
          <div className="num-stepper">
            <button type="button" onClick={() => onCertificationsChange(Math.max(0, certifications - 1))} aria-label="Decrease certifications">−</button>
            <input
              id="numCerts"
              type="number"
              min={0}
              max={50}
              value={certifications}
              onChange={(e) => onCertificationsChange(Math.max(0, Math.min(50, Number(e.target.value) || 0)))}
            />
            <button type="button" onClick={() => onCertificationsChange(Math.min(50, certifications + 1))} aria-label="Increase certifications">+</button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onReset}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </svg>
          Reset
        </button>
        <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={onGenerate} disabled={saving}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 3v5h5M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
          </svg>
          {saving ? "Saving…" : "Generate report"}
        </button>
      </div>
    </>
  );
}
