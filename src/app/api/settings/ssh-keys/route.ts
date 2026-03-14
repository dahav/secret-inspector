import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const keys = await prisma.sshKey.findMany({
    select: {
      id: true,
      name: true,
      projectId: true,
      createdAt: true,
      project: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(keys);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, privateKey, projectId } = body;

  if (!name || !privateKey) {
    return NextResponse.json(
      { error: "Name und Private Key sind erforderlich" },
      { status: 400 }
    );
  }

  const trimmedKey = privateKey.trim();

  if (!trimmedKey.includes("PRIVATE KEY")) {
    return NextResponse.json(
      { error: "Ungültiger Key — bitte den Private Key hinterlegen (beginnt mit -----BEGIN ... PRIVATE KEY-----), nicht den Public Key." },
      { status: 400 }
    );
  }

  if (!trimmedKey.match(/-----END [A-Z ]+ PRIVATE KEY-----$/)) {
    return NextResponse.json(
      { error: "Der Private Key ist unvollständig — es fehlt die END-Zeile (-----END ... PRIVATE KEY-----). Bitte den vollständigen Key einfügen." },
      { status: 400 }
    );
  }

  // Ensure trailing newline (required by SSH)
  const normalizedKey = trimmedKey + "\n";

  const key = await prisma.sshKey.create({
    data: {
      name,
      privateKey: normalizedKey,
      projectId: projectId || null,
    },
  });

  return NextResponse.json(
    { id: key.id, name: key.name, createdAt: key.createdAt },
    { status: 201 }
  );
}
