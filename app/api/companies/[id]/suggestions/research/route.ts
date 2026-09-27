import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db-status";
import { AiResearchNotConfiguredError, researchCompanyBenchmark } from "@/lib/ai-research";

export const dynamic = "force-dynamic";

/**
 * POST — asks the optional AI-research source (lib/ai-research.ts) for an
 * updated benchmark and files the result as a PENDING "AI_RESEARCH"
 * suggestion. Gracefully reports "not configured" (never a crash or a
 * silent failure) when ANTHROPIC_API_KEY isn't set, since this project
 * intentionally ships key-free by default. Also needs a database, since
 * that's where the resulting suggestion is filed.
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
    const researched = await researchCompanyBenchmark(company.name, company);

    const suggestion = await prisma.benchmarkSuggestion.create({
      data: {
        companyId: company.id,
        source: "AI_RESEARCH",
        java: researched.java ?? null,
        python: researched.python ?? null,
        sql: researched.sql ?? null,
        dsa: researched.dsa ?? null,
        communication: researched.communication ?? null,
        projects: researched.projects ?? null,
        certifications: researched.certifications ?? null,
        rationale: researched.rationale,
        citationUrl: researched.citationUrl ?? null,
      },
    });

    return NextResponse.json({ suggestion }, { status: 201 });
  } catch (err) {
    if (err instanceof AiResearchNotConfiguredError) {
      return NextResponse.json(
        { error: "not_configured", message: err.message },
        { status: 501 }
      );
    }
    console.error("AI research failed:", err);
    return NextResponse.json({ error: "AI research failed. Try again shortly." }, { status: 502 });
  }
}
