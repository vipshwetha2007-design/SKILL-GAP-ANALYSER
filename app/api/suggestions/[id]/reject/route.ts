import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** POST — marks a PENDING suggestion REJECTED without touching the Company row. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const suggestion = await prisma.benchmarkSuggestion.findUnique({ where: { id } });
  if (!suggestion) return NextResponse.json({ error: "Suggestion not found." }, { status: 404 });
  if (suggestion.status !== "PENDING") {
    return NextResponse.json({ error: `This suggestion was already ${suggestion.status.toLowerCase()}.` }, { status: 409 });
  }

  const updated = await prisma.benchmarkSuggestion.update({
    where: { id },
    data: { status: "REJECTED", reviewedAt: new Date() },
  });

  return NextResponse.json({ suggestion: updated });
}
