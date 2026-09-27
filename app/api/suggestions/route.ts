import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db-status";

export const dynamic = "force-dynamic";

/** GET — lists benchmark suggestions across every company. */
export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) return NextResponse.json({ suggestions: [] });

  const status = req.nextUrl.searchParams.get("status") ?? "PENDING";

  const suggestions = await prisma.benchmarkSuggestion.findMany({
    where: status === "ALL" ? undefined : { status },
    orderBy: { createdAt: "desc" },
    include: { company: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ suggestions });
}
