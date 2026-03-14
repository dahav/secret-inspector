import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { overdueThreshold } from "@/lib/risk";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const findings = await prisma.finding.findMany({
    where: { projectId: id },
    select: {
      status: true,
      risiko: true,
      remediationType: true,
      assessmentUpdatedAt: true,
      isDuplicate: true,
    },
  });

  const statusCounts: Record<string, number> = {
    found: 0,
    assessed: 0,
    "in-progress": 0,
    rotated: 0,
    verified: 0,
    closed: 0,
    "false-positive": 0,
  };

  let kritisch = 0,
    hoch = 0,
    mittel = 0,
    niedrig = 0;
  let intern = 0,
    extern = 0,
    offen = 0;
  let overdue = 0;
  const now = new Date();

  for (const f of findings) {
    statusCounts[f.status] = (statusCounts[f.status] || 0) + 1;

    if (f.risiko >= 20) kritisch++;
    else if (f.risiko >= 12) hoch++;
    else if (f.risiko >= 6) mittel++;
    else niedrig++;

    switch (f.remediationType) {
      case "internal":
        intern++;
        break;
      case "external":
        extern++;
        break;
      default:
        offen++;
    }

    if (
      (f.status === "assessed" || f.status === "in-progress") &&
      f.assessmentUpdatedAt
    ) {
      const days = Math.floor(
        (now.getTime() - new Date(f.assessmentUpdatedAt).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (days > overdueThreshold(f.risiko)) {
        overdue++;
      }
    }
  }

  return NextResponse.json({
    total: findings.length,
    statusCounts,
    riskCounts: { kritisch, hoch, mittel, niedrig },
    remediationCounts: { intern, extern, offen },
    overdue,
  });
}
