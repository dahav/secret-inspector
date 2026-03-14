import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import ExcelJS from "exceljs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json(
      { error: "Projekt nicht gefunden" },
      { status: 404 }
    );
  }

  const findings = await prisma.finding.findMany({
    where: {
      projectId: id,
      isDuplicate: false,
      distLocation: { not: "" },
    },
    include: { repo: { select: { name: true } } },
    orderBy: { stableId: "asc" },
  });

  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Rotation Report");

  // Headers
  const headers = ["Repo", "ENV_VAR", "Secret (100)", "Dist"];
  sheet.addRow(headers);
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };
  });

  // Data rows
  for (const f of findings) {
    const secret =
      f.secret.length > 100 ? f.secret.slice(0, 100) + "…" : f.secret;
    sheet.addRow([f.repo.name, f.distEnvVar, secret, f.distLocation]);
  }

  // Auto-width
  sheet.columns.forEach((col) => {
    let maxLen = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > maxLen) maxLen = Math.min(len, 50);
    });
    col.width = maxLen + 2;
  });

  const buffer = await wb.xlsx.writeBuffer();
  const safeName = project.name.replace(/[^a-zA-Z0-9-_]/g, "_");

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${safeName}_Rotation-Report.xlsx"`,
    },
  });
}
