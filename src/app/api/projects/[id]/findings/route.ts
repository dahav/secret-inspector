import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status");
  const risiko = searchParams.get("risiko");
  const repoId = searchParams.get("repoId");
  const deduplicate = searchParams.get("deduplicate") === "true";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  const where: Record<string, unknown> = { projectId: id };
  if (status) where.status = status;
  if (repoId) where.repoId = repoId;

  if (risiko) {
    switch (risiko) {
      case "kritisch":
        where.risiko = { gte: 20 };
        break;
      case "hoch":
        where.risiko = { gte: 12, lt: 20 };
        break;
      case "mittel":
        where.risiko = { gte: 6, lt: 12 };
        break;
      case "niedrig":
        where.risiko = { lt: 6 };
        break;
    }
  }

  if (deduplicate) {
    where.isDuplicate = false;
  }

  const [findings, total] = await Promise.all([
    prisma.finding.findMany({
      where,
      include: { repo: { select: { name: true, type: true } } },
      orderBy: { stableId: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.finding.count({ where }),
  ]);

  return NextResponse.json({
    findings,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
