import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateCustomerExport, ExportRow } from "@/lib/export";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project) {
    return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
  }

  const findings = await prisma.finding.findMany({
    where: { projectId: id, isDuplicate: false },
    include: { repo: { select: { name: true } } },
    orderBy: { stableId: "asc" },
  });

  const rows: ExportRow[] = findings.map((f) => ({
    id: f.stableId,
    fingerprint: f.fingerprint,
    repo: f.repo.name,
    ruleId: f.ruleId,
    w: f.w,
    s: f.s,
    risiko: f.risiko,
    status: f.status,
    ticketId: f.ticketId,
    nachweis: f.nachweis,
  }));

  const buffer = await generateCustomerExport(project.name, rows);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${project.name.replace(/[^a-zA-Z0-9-_]/g, "_")}_Report.xlsx"`,
    },
  });
}
