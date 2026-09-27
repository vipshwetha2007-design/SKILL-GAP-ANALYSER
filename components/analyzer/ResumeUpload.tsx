"use client";

import { useState, useRef } from "react";
import type { CompanyRequirements } from "@/lib/scoring";

export function ResumeUpload({
  companies,
  companyId,
  onCompanyChange,
  onConfirmSkills,
}: {
  companies: CompanyRequirements[];
  companyId: string;
  onCompanyChange: (id: string) => void;
  onConfirmSkills: (name: string, skills: string[]) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedSkills, setDetectedSkills] = useState<string[] | null>(null);
  const [candidateName, setCandidateName] = useState("");
  const [newSkill, setNewSkill] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Please select a file first.");
      return;
    }
    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const res = await fetch("/api/extract-resume", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to extract resume.");
      }
      setDetectedSkills(data.skills.map((s: any) => s.name));
      // Basic heuristic to guess name from filename
      let n = file.name.replace(/\.(pdf|docx)$/i, "").replace(/[-_]/g, " ");
      if (n.toLowerCase().includes("resume")) {
        n = n.toLowerCase().replace("resume", "").trim();
      }
      setCandidateName(n || "Candidate");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function addSkill() {
    if (newSkill.trim() && detectedSkills) {
      if (!detectedSkills.includes(newSkill.trim())) {
        setDetectedSkills([...detectedSkills, newSkill.trim()]);
      }
      setNewSkill("");
    }
  }

  function removeSkill(skill: string) {
    if (detectedSkills) {
      setDetectedSkills(detectedSkills.filter((s) => s !== skill));
    }
  }

  if (detectedSkills) {
    return (
      <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div className="section-label">Review detected skills</div>
        <div className="field">
          <label>Candidate Name</label>
          <input
            className="input"
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
            placeholder="Name for the report"
          />
        </div>
        
        <div className="field">
          <label>Skills found</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
            {detectedSkills.map((s) => (
              <span key={s} style={{ background: "var(--accent-soft)", color: "var(--accent)", fontSize: "0.75rem", fontWeight: 600, padding: "4px 8px", borderRadius: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                {s}
                <button type="button" onClick={() => removeSkill(s)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", opacity: 0.7, padding: 0, fontSize: "1rem", lineHeight: 1 }}>
                  &times;
                </button>
              </span>
            ))}
            {detectedSkills.length === 0 && <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>No technical skills detected.</span>}
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              type="text"
              className="input"
              placeholder="Add missing skill..."
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
            />
            <button type="button" className="btn btn-ghost btn-sm" onClick={addSkill}>Add</button>
          </div>
        </div>

        <div className="field" style={{ marginTop: "8px" }}>
          <label>Dream company</label>
          <select className="input" value={companyId} onChange={(e) => onCompanyChange(e.target.value)}>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
          <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setDetectedSkills(null); setFile(null); }}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => onConfirmSkills(candidateName, detectedSkills)}>
            Confirm & Analyze
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleUpload} className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div className="section-label">Upload Resume</div>
      
      <div className="field">
        <label>Select PDF or DOCX</label>
        <div 
          className="drop-zone"
          style={{
            border: "2px dashed var(--line-strong)",
            borderRadius: "var(--radius-m)",
            padding: "24px 16px",
            textAlign: "center",
            background: "var(--surface-2)",
            cursor: "pointer",
            position: "relative",
            transition: "all 0.2s ease"
          }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = "var(--accent)";
            e.currentTarget.style.background = "var(--accent-soft)";
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = "var(--line-strong)";
            e.currentTarget.style.background = "var(--surface-2)";
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = "var(--line-strong)";
            e.currentTarget.style.background = "var(--surface-2)";
            const f = e.dataTransfer.files?.[0];
            if (f) setFile(f);
          }}
        >
          <input
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ref={fileInputRef}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setFile(f);
            }}
            style={{ display: "none" }}
          />
          {file ? (
            <div>
              <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: "4px" }}>{file.name}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{(file.size / 1024).toFixed(1)} KB</div>
              <div style={{ fontSize: "0.75rem", color: "var(--accent)", marginTop: "8px", fontWeight: 600 }}>Click to change</div>
            </div>
          ) : (
            <div>
              <div style={{ color: "var(--muted)", marginBottom: "4px" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 24, height: 24, margin: "0 auto", display: "block" }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>Click or drag file here</div>
              <div style={{ fontSize: "0.75rem", color: "var(--faint)", marginTop: "4px" }}>Supports PDF and DOCX</div>
            </div>
          )}
        </div>
      </div>

      {error && <div style={{ color: "var(--critical)", fontSize: "0.8rem", fontWeight: 600 }}>{error}</div>}

      <button type="submit" className="btn btn-primary" disabled={uploading || !file}>
        {uploading ? "Extracting..." : "Extract Skills"}
      </button>

      <p style={{ fontSize: "0.75rem", color: "var(--faint)", margin: 0, lineHeight: 1.4, textAlign: "center" }}>
        We extract technical skills directly from your resume text to seed the analysis. No data is sent to external AI providers.
      </p>
    </form>
  );
}
