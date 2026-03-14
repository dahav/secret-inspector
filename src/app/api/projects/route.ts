import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const projects = await prisma.project.findMany({
    include: {
      repos: true,
      _count: { select: { findings: true, scans: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, idPrefix } = body;

  if (!name || !idPrefix) {
    return NextResponse.json(
      { error: "Name und ID-Prefix sind erforderlich" },
      { status: 400 }
    );
  }

  const project = await prisma.project.create({
    data: { name, idPrefix: idPrefix.toUpperCase() },
  });

  return NextResponse.json(project, { status: 201 });
}
