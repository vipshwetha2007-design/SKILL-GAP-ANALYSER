"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Navbar() {
  const pathname = usePathname();

  const linkStyle = (href: string): React.CSSProperties => ({
    fontSize: "0.82rem",
    fontWeight: 600,
    color: pathname === href ? "var(--ink)" : "var(--muted)",
    padding: "7px 10px",
    borderRadius: 8,
    background: pathname === href ? "var(--surface-2)" : "transparent",
  });

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "18px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(155deg, var(--accent), #b8481c)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow)", flexShrink: 0 }}>
          <svg viewBox="0 0 24 24" fill="none" width={20} height={20}>
            <circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.6" />
            <circle cx="12" cy="12" r="5" stroke="#fff" strokeWidth="1.6" />
            <circle cx="12" cy="12" r="1.4" fill="#fff" />
          </svg>
        </div>
        <span className="display" style={{ fontWeight: 600, fontSize: "1.05rem" }}>Skill Gap Analyzer</span>
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <Link href="/" style={linkStyle("/")}>Analyze</Link>
        <Link href="/dashboard/history" style={linkStyle("/dashboard/history")}>History</Link>
        <Link href="/admin/companies" style={linkStyle("/admin/companies")}>Companies</Link>
        <ThemeToggle />
      </div>
    </div>
  );
}
