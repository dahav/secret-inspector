import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const groups = await prisma.group.findMany({
    where: { projectId: id },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(groups);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  if (!body.name) {
    return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
  }

  const group = await prisma.group.create({
    data: {
      projectId: id,
      name: body.name,
      repoNames: body.repoNames || "",
    },
  });

  return NextResponse.json(group, { status: 201 });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  if (!body.id) {
    return NextResponse.json({ error: "Group ID ist erforderlich" }, { status: 400 });
  }

  const group = await prisma.group.update({
    where: { id: body.id, projectId: id },
    data: {
      name: body.name,
      repoNames: body.repoNames,
    },
  });

  return NextResponse.json(group);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");

  if (!groupId) {
    return NextResponse.json({ error: "groupId Parameter fehlt" }, { status: 400 });
  }

  await prisma.group.delete({ where: { id: groupId, projectId: id } });
  return NextResponse.json({ ok: true });
}
