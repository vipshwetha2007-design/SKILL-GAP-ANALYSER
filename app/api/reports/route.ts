import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db-status";
import { GUEST_USER_ID, ensureGuestUser } from "@/lib/guest";
import { getCompanies } from "@/lib/companies";
import { analyze, generateReportText, sanitizeStudentInput } from "@/lib/scoring";

/** Round-trips a plain object/array through JSON so it structurally matches
 *  Prisma's `InputJsonValue` — our typed arrays (StrengthEntry[], etc.) are
 *  already JSON-safe, TS just can't see that through the named interfaces. */
function toJson<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value));
}

export const dynamic = "force-dynamic";

const reportInput = z.object({
  companyId: z.string().min(1),
  name: z.string().min(1).max(120),
  java: z.number(),
  python: z.number(),
  sql: z.number(),
  dsa: z.number(),
  communication: z.number(),
  projects: z.number(),
  certifications: z.number(),
  extractedSkills: z.array(z.string()).optional(),
  analysisMode: z.string().optional(),
  inputMode: z.string().optional(),
  liveJobData: z.any().optional(),
});

/** Saved analysis history, newest first. Empty (not an error) with no database configured. */
export async function GET() {
  if (!isDatabaseConfigured()) return NextResponse.json({ reports: [], saved: false });

  const reports = await prisma.report.findMany({
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
      gapDetails: true, // We fetch gapDetails to extract the bundled metadata
    },
  });

  return NextResponse.json({ reports, saved: true });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = reportInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const companies = await getCompanies();
  const company = companies.find((c) => c.id === parsed.data.companyId);
  if (!company) return NextResponse.json({ error: "Unknown company." }, { status: 404 });

  const student = sanitizeStudentInput(parsed.data);
  const result = analyze(student, company, parsed.data.liveJobData);
  const reportText = generateReportText(student, company, result);

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ report: null, result, reportText, saved: false }, { status: 201 });
  }

  await ensureGuestUser();
  const report = await prisma.report.create({
    data: {
      userId: GUEST_USER_ID,
      companyId: company.id,
      studentName: student.name,
      companyName: company.name,
      java: student.java,
      python: student.python,
      sql: student.sql,
      dsa: student.dsa,
      communication: student.communication,
      projects: student.projects,
      certifications: student.certifications,
      readinessScore: result.readinessScore,
      status: result.status,
      statusEmoji: result.statusEmoji,
      strengths: toJson(result.strengths),
      missingSkills: toJson(result.missingSkills),
      // We bundle the meta into gapDetails to avoid schema migrations
      gapDetails: toJson({
        items: result.gapDetails,
        meta: {
          analysisMode: parsed.data.analysisMode || "benchmark",
          inputMode: parsed.data.inputMode || "manual",
          liveJobInsights: result.liveJobInsights
        }
      }),
      recommendations: toJson(result.recommendations),
      roadmap: toJson(result.roadmap),
      reportText,
    },
  });

  return NextResponse.json({ report, result, reportText, saved: true }, { status: 201 });
}
