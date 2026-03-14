import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; findingId: string }> }
) {
  const { findingId } = await params;
  const finding = await prisma.finding.findUnique({
    where: { id: findingId },
    include: { repo: true },
  });

  if (!finding) {
    return NextResponse.json({ error: "Finding nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json(finding);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; findingId: string }> }
) {
  const { findingId } = await params;
  const body = await req.json();

  // Only allow updating assessment fields
  const data: Record<string, unknown> = {};
  const assessmentFields = [
    "w",
    "s",
    "status",
    "ticketId",
    "nachweis",
    "remediationType",
    "bemerkung",
    "falsePositive",
  ];

  for (const field of assessmentFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  // Recalculate risiko if w or s changed
  if (data.w !== undefined || data.s !== undefined) {
    const current = await prisma.finding.findUnique({
      where: { id: findingId },
      select: { w: true, s: true },
    });
    if (current) {
      const w = (data.w as number) ?? current.w;
      const s = (data.s as number) ?? current.s;
      data.risiko = w * s;
    }
  }

  data.assessmentUpdatedAt = new Date();
  data.assessmentUpdatedBy = body.updatedBy || "web";

  const finding = await prisma.finding.update({
    where: { id: findingId },
    data,
  });

  return NextResponse.json(finding);
}
