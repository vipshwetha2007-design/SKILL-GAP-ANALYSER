import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db-status";
import { GUEST_USER_ID, ensureGuestUser } from "@/lib/guest";

export const dynamic = "force-dynamic";

const SKILL_KEYS = ["java", "python", "sql", "dsa", "communication"] as const;

const interviewReportInput = z.object({
  role: z.string().max(120).optional(),
  outcome: z.enum(["OFFER", "REJECTED", "NO_RESPONSE", "IN_PROGRESS"]),
  skillsTested: z.array(z.enum(SKILL_KEYS)).min(1),
  perceivedJava: z.number().int().min(0).max(10).nullable().optional(),
  perceivedPython: z.number().int().min(0).max(10).nullable().optional(),
  perceivedSql: z.number().int().min(0).max(10).nullable().optional(),
  perceivedDsa: z.number().int().min(0).max(10).nullable().optional(),
  perceivedCommunication: z.number().int().min(0).max(10).nullable().optional(),
  difficulty: z.number().int().min(1).max(5),
  notes: z.string().max(1000).optional(),
});

/**
 * POST — logs what a real interview at this company actually tested. This
 * never changes the live benchmark by itself; aggregating reports into a
 * reviewable suggestion is a separate step (see /suggestions/from-reports).
 * Needs a database — with none configured, reports gracefully "not
 * configured" instead of crashing.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "not_configured", message: "Interview reports need a database — set DATABASE_URL to enable this." },
      { status: 501 }
    );
  }

  const { id } = await params;
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) return NextResponse.json({ error: "Unknown company." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = interviewReportInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid interview report.", issues: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  await ensureGuestUser();
  const report = await prisma.interviewReport.create({
    data: {
      companyId: company.id,
      userId: GUEST_USER_ID,
      role: data.role || null,
      outcome: data.outcome,
      skillsTested: data.skillsTested,
      perceivedJava: data.perceivedJava ?? null,
      perceivedPython: data.perceivedPython ?? null,
      perceivedSql: data.perceivedSql ?? null,
      perceivedDsa: data.perceivedDsa ?? null,
      perceivedCommunication: data.perceivedCommunication ?? null,
      difficulty: data.difficulty,
      notes: data.notes || null,
    },
  });

  return NextResponse.json({ report }, { status: 201 });
}

/** GET — raw feed of interview reports for one company. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ reports: [] });

  const { id } = await params;
  const reports = await prisma.interviewReport.findMany({
    where: { companyId: id },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json({ reports });
}
