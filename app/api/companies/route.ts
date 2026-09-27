import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db-status";
import { getCompanies } from "@/lib/companies";

export const dynamic = "force-dynamic";

const companyInput = z.object({
  name: z.string().min(2).max(60),
  description: z.string().min(10).max(400),
  java: z.number().int().min(0).max(10),
  python: z.number().int().min(0).max(10),
  sql: z.number().int().min(0).max(10),
  dsa: z.number().int().min(0).max(10),
  communication: z.number().int().min(0).max(10),
  projects: z.number().int().min(0).max(50),
  certifications: z.number().int().min(0).max(50),
  sourceUrl: z.string().url().nullable().optional(),
});

/** Public — the benchmark list, needed to run an analysis. Falls back to
 * the built-in defaults with no database configured. */
export async function GET() {
  const companies = await getCompanies();
  return NextResponse.json({ companies });
}

/** Adds a new dream company. There's no login anymore (single local tool),
 * so this just needs a database to persist to. */
export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Managing companies needs a database. Set DATABASE_URL to enable this." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = companyInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid company data.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.company.findUnique({ where: { name: parsed.data.name } });
  if (existing) {
    return NextResponse.json({ error: "A company with that name already exists." }, { status: 409 });
  }

  const company = await prisma.company.create({ data: parsed.data });
  return NextResponse.json({ company }, { status: 201 });
}
