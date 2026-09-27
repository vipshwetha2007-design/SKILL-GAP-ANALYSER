import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { CompanyManager } from "@/components/admin/CompanyManager";
import { SuggestionsPanel } from "@/components/admin/SuggestionsPanel";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db-status";

export const dynamic = "force-dynamic";

export default async function AdminCompaniesPage() {
  const dbReady = isDatabaseConfigured();

  if (!dbReady) {
    return (
      <>
        <Navbar />
        <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 70px" }}>
          <h1 className="display" style={{ fontSize: "1.4rem", fontWeight: 600, marginBottom: 4 }}>Dream company benchmarks</h1>
          <div className="card card-pad" style={{ marginTop: 18, textAlign: "center", padding: "40px 20px" }}>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16 }}>
              Managing companies, interview reports and benchmark suggestions needs a database. Set{" "}
              <code>DATABASE_URL</code> to enable this — the analyzer itself works fine with the built-in
              company benchmarks and no database at all.
            </p>
            <Link href="/" className="btn btn-primary">Go to analyzer</Link>
          </div>
        </main>
      </>
    );
  }

  const [companies, suggestions] = await Promise.all([
    prisma.company.findMany({ orderBy: { name: "asc" } }),
    prisma.benchmarkSuggestion.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { company: { select: { id: true, name: true } } },
    }),
  ]);

  const currentByCompany: Record<string, Record<string, number>> = {};
  for (const c of companies) {
    currentByCompany[c.id] = {
      java: c.java,
      python: c.python,
      sql: c.sql,
      dsa: c.dsa,
      communication: c.communication,
      projects: c.projects,
      certifications: c.certifications,
    };
  }

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 70px", display: "flex", flexDirection: "column", gap: 22 }}>
        <div>
          <h1 className="display" style={{ fontSize: "1.4rem", fontWeight: 600, marginBottom: 4 }}>Dream company benchmarks</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
            Add, edit or retire the companies students can analyze against. Changes apply to new analyses immediately —
            past saved reports keep their own snapshot, so editing a benchmark never rewrites history. Use the
            actions on each company to turn student interview reports or AI research into a reviewable suggestion below.
          </p>
        </div>

        <SuggestionsPanel suggestions={suggestions} currentByCompany={currentByCompany} />

        <CompanyManager initial={companies} />
      </main>
    </>
  );
}
