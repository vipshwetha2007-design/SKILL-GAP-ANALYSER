import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db-status";
import { ExternalJobsNotConfiguredError, researchCompanyFromJobPostings } from "@/lib/external-jobs";

export const dynamic = "force-dynamic";

/**
 * POST — pulls current job postings for this company via JSearch (RapidAPI)
 * and files the result as a PENDING "EXTERNAL_API" suggestion. Gracefully
 * reports "not configured" (never a crash) when RAPIDAPI_KEY isn't set —
 * this source ships off by default, same as AI research. The JSearch call
 * itself (researchCompanyFromJobPostings) is unchanged; only the
 * now-removed login/admin gate and this added database guard are new.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "not_configured", message: "Benchmark suggestions need a database — set DATABASE_URL to enable this." },
      { status: 501 }
    );
  }

  const { id } = await params;
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) return NextResponse.json({ error: "Unknown company." }, { status: 404 });

  try {
    const researched = await researchCompanyFromJobPostings(company.name);

    const suggestion = await prisma.benchmarkSuggestion.create({
      data: {
        companyId: company.id,
        source: "EXTERNAL_API",
        java: researched.java ?? null,
        python: researched.python ?? null,
        sql: researched.sql ?? null,
        dsa: researched.dsa ?? null,
        communication: researched.communication ?? null,
        rationale: researched.rationale,
        citationUrl: researched.citationUrl ?? null,
        basedOnReports: researched.postingsAnalyzed,
      },
    });

    return NextResponse.json({ suggestion }, { status: 201 });
  } catch (err) {
    if (err instanceof ExternalJobsNotConfiguredError) {
      return NextResponse.json({ error: "not_configured", message: err.message }, { status: 501 });
    }
    console.error("External jobs lookup failed:", err);
    const message = err instanceof Error ? err.message : "Job postings lookup failed. Try again shortly.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
