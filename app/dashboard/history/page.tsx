import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db-status";
import { GUEST_USER_ID } from "@/lib/guest";
import { HistoryDashboard } from "@/components/history/HistoryDashboard";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const dbReady = isDatabaseConfigured();

  const reports = dbReady
    ? await prisma.report.findMany({
        where: { userId: GUEST_USER_ID },
        orderBy: { createdAt: "desc" },
        select: { 
          id: true, 
          studentName: true, 
          companyName: true, 
          readinessScore: true, 
          status: true, 
          statusEmoji: true, 
          createdAt: true,
          gapDetails: true,
          strengths: true
        },
      })
    : [];

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
          <h1 className="display" style={{ fontSize: "1.4rem", fontWeight: 600 }}>Your analysis history</h1>
          <Link href="/" className="btn btn-primary btn-sm">New analysis</Link>
        </div>

        {!dbReady ? (
          <div className="card card-pad" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16 }}>
              Saved history needs a database. Set <code>DATABASE_URL</code> to enable it — the analyzer
              itself works fine without one.
            </p>
            <Link href="/" className="btn btn-primary">Go to analyzer</Link>
          </div>
        ) : (
          <HistoryDashboard reports={reports} />
        )}
      </main>
    </>
  );
}
