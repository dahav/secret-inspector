import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { repoNameFromUrl } from "@/lib/git";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const repos = await prisma.repo.findMany({
    where: { projectId: id },
    orderBy: { type: "asc" },
  });
  return NextResponse.json(repos);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { url, branch, type } = body;

  if (!url || !type) {
    return NextResponse.json(
      { error: "URL und Typ sind erforderlich" },
      { status: 400 }
    );
  }

  if (type !== "source" && type !== "dist") {
    return NextResponse.json(
      { error: "Typ muss 'source' oder 'dist' sein" },
      { status: 400 }
    );
  }

  const name = repoNameFromUrl(url);

  const repo = await prisma.repo.create({
    data: {
      projectId: id,
      url,
      branch: branch || null,
      name,
      type,
    },
  });

  return NextResponse.json(repo, { status: 201 });
}
