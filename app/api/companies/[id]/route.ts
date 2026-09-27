import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db-status";

export const dynamic = "force-dynamic";

const companyUpdate = z.object({
  name: z.string().min(2).max(60).optional(),
  description: z.string().min(10).max(400).optional(),
  java: z.number().int().min(0).max(10).optional(),
  python: z.number().int().min(0).max(10).optional(),
  sql: z.number().int().min(0).max(10).optional(),
  dsa: z.number().int().min(0).max(10).optional(),
  communication: z.number().int().min(0).max(10).optional(),
  projects: z.number().int().min(0).max(50).optional(),
  certifications: z.number().int().min(0).max(50).optional(),
  sourceUrl: z.string().url().nullable().optional(),
  lastVerifiedAt: z.coerce.date().optional(),
});

function requireDatabase() {
  if (isDatabaseConfigured()) return null;
  return NextResponse.json(
    { error: "Managing companies needs a database. Set DATABASE_URL to enable this." },
    { status: 503 }
  );
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guardError = requireDatabase();
  if (guardError) return guardError;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = companyUpdate.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid company data.", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const company = await prisma.company.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ company });
  } catch {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guardError = requireDatabase();
  if (guardError) return guardError;

  const { id } = await params;
  try {
    await prisma.company.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }
}
