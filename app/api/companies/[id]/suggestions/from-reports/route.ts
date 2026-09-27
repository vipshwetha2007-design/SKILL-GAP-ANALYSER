import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db-status";

export const dynamic = "force-dynamic";

const PERCEIVED_TO_FIELD = {
  perceivedJava: "java",
  perceivedPython: "python",
  perceivedSql: "sql",
  perceivedDsa: "dsa",
  perceivedCommunication: "communication",
} as const;

/**
 * POST — admin-only. Averages every student-submitted InterviewReport for
 * this company into one PENDING "CROWDSOURCED" BenchmarkSuggestion. Only
 * dimensions at least one report actually rated are touched; nothing here
 * writes to the live Company row — that only happens if/when an admin
 * approves the resulting suggestion.
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

  const reports = await prisma.interviewReport.findMany({ where: { companyId: id } });
  if (reports.length === 0) {
    return NextResponse.json({ error: "No interview reports have been submitted for this company yet." }, { status: 400 });
  }

  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const report of reports) {
    for (const [perceivedKey, field] of Object.entries(PERCEIVED_TO_FIELD)) {
      const value = (report as unknown as Record<string, number | null>)[perceivedKey];
      if (value === null || value === undefined) continue;
      sums[field] = (sums[field] ?? 0) + value;
      counts[field] = (counts[field] ?? 0) + 1;
    }
  }

  const averaged: Record<string, number> = {};
  for (const field of Object.keys(sums)) {
    averaged[field] = Math.round(sums[field] / counts[field]);
  }

  if (Object.keys(averaged).length === 0) {
    return NextResponse.json(
      { error: "Reports exist, but none included a perceived skill rating to average." },
      { status: 400 }
    );
  }

  const offers = reports.filter((r) => r.outcome === "OFFER").length;
  const ratedDims = Object.keys(averaged).join(", ");
  const rationale =
    `Averaged from ${reports.length} student interview report${reports.length === 1 ? "" : "s"} ` +
    `(${offers} reported an offer). Dimensions with at least one rating: ${ratedDims}.`;

  const suggestion = await prisma.benchmarkSuggestion.create({
    data: {
      companyId: company.id,
      source: "CROWDSOURCED",
      java: averaged.java ?? null,
      python: averaged.python ?? null,
      sql: averaged.sql ?? null,
      dsa: averaged.dsa ?? null,
      communication: averaged.communication ?? null,
      rationale,
      basedOnReports: reports.length,
    },
  });

  return NextResponse.json({ suggestion }, { status: 201 });
}
