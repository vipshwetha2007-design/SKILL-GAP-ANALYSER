"use client";

import { useEffect, useState } from "react";

type Mode = "system" | "light" | "dark";

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    try {
      const saved = (localStorage.getItem("sga-theme") as Mode | null) ?? "system";
      apply(saved);
      setMode(saved);
    } catch {
      /* localStorage unavailable — fall back to system default */
    }
  }, []);

  function apply(next: Mode) {
    if (next === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", next);
  }

  function choose(next: Mode) {
    apply(next);
    setMode(next);
    try {
      localStorage.setItem("sga-theme", next);
    } catch {
      /* per-viewer convenience only — fine if it can't persist */
    }
  }

  const options: { key: Mode; label: string; icon: React.ReactNode }[] = [
    {
      key: "system",
      label: "System theme",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      ),
    },
    {
      key: "light",
      label: "Light theme",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </svg>
      ),
    },
    {
      key: "dark",
      label: "Dark theme",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z" />
        </svg>
      ),
    },
  ];

  return (
    <div
      role="group"
      aria-label="Theme"
      style={{ display: "flex", gap: 2, background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 999, padding: 3 }}
    >
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          title={opt.label}
          aria-label={opt.label}
          onClick={() => choose(opt.key)}
          style={{
            border: "none",
            background: mode === opt.key ? "var(--surface)" : "transparent",
            color: mode === opt.key ? "var(--ink)" : "var(--muted)",
            width: 30,
            height: 30,
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: mode === opt.key ? "var(--shadow)" : "none",
          }}
        >
          <span style={{ width: 15, height: 15 }}>{opt.icon}</span>
        </button>
      ))}
    </div>
  );
}
