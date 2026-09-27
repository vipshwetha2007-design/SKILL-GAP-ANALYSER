import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const FIELDS = ["java", "python", "sql", "dsa", "communication", "projects", "certifications"] as const;

/**
 * POST — applies a PENDING suggestion's non-null fields to its Company and
 * stamps sourceUrl/lastVerifiedAt, then marks the suggestion APPROVED. This
 * is the only place a suggestion is allowed to touch live benchmark data —
 * nothing upstream (manual entry aside) writes to Company directly. (Only
 * reachable when a suggestion already exists, which itself requires a
 * database, so no extra guard needed here.)
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const suggestion = await prisma.benchmarkSuggestion.findUnique({ where: { id } });
  if (!suggestion) return NextResponse.json({ error: "Suggestion not found." }, { status: 404 });
  if (suggestion.status !== "PENDING") {
    return NextResponse.json({ error: `This suggestion was already ${suggestion.status.toLowerCase()}.` }, { status: 409 });
  }

  const companyUpdate: Record<string, number | string | Date> = { lastVerifiedAt: new Date() };
  for (const field of FIELDS) {
    const value = suggestion[field];
    if (value !== null && value !== undefined) companyUpdate[field] = value;
  }
  if (suggestion.citationUrl) companyUpdate.sourceUrl = suggestion.citationUrl;

  const [company, updated] = await prisma.$transaction([
    prisma.company.update({ where: { id: suggestion.companyId }, data: companyUpdate }),
    prisma.benchmarkSuggestion.update({
      where: { id },
      data: { status: "APPROVED", reviewedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ company, suggestion: updated });
}
