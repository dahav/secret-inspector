import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { repoNameFromUrl } from "@/lib/git";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; repoId: string }> }
) {
  const { repoId } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.url) {
    data.url = body.url;
    data.name = repoNameFromUrl(body.url);
  }
  if (body.branch !== undefined) data.branch = body.branch || null;
  if (body.type) data.type = body.type;

  const repo = await prisma.repo.update({
    where: { id: repoId },
    data,
  });

  return NextResponse.json(repo);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; repoId: string }> }
) {
  const { repoId } = await params;
  await prisma.repo.delete({ where: { id: repoId } });
  return NextResponse.json({ ok: true });
}
