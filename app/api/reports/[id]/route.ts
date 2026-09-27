import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });

  return NextResponse.json({ report });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });

  await prisma.report.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
