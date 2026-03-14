import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scans = await prisma.scan.findMany({
    where: { projectId: id },
    orderBy: { startedAt: "desc" },
  });
  return NextResponse.json(scans);
}
