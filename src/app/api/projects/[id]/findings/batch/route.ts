import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
  const body = await req.json();
  const { findingIds, updates } = body;

  if (!Array.isArray(findingIds) || findingIds.length === 0) {
    return NextResponse.json({ error: "findingIds Array ist erforderlich" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  const assessmentFields = [
    "status",
    "ticketId",
    "nachweis",
    "remediationType",
    "bemerkung",
    "falsePositive",
  ];

  for (const field of assessmentFields) {
    if (updates[field] !== undefined) {
      data[field] = updates[field];
    }
  }

  data.assessmentUpdatedAt = new Date();
  data.assessmentUpdatedBy = updates.updatedBy || "web";

  const result = await prisma.finding.updateMany({
    where: { id: { in: findingIds } },
    data,
  });

  return NextResponse.json({ updated: result.count });
}
