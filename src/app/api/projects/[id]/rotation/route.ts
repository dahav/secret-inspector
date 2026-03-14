import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const findings = await prisma.finding.findMany({
    where: {
      projectId: id,
      isDuplicate: false,
      distLocation: { not: "" },
    },
    select: {
      id: true,
      secret: true,
      distEnvVar: true,
      distLocation: true,
      repo: { select: { name: true } },
    },
    orderBy: { stableId: "asc" },
  });

  return NextResponse.json(findings);
}
