/**
 * Customer Excel export — port from Go cmd/export_write.go
 */

import ExcelJS from "exceljs";

export interface ExportRow {
  id: string;
  fingerprint: string;
  repo: string;
  ruleId: string;
  w: number;
  s: number;
  risiko: number;
  status: string;
  ticketId: string;
  nachweis: string;
}

const CUSTOMER_HEADERS = [
  "ID",
  "GitLeaks Verknuepfung",
  "Repository",
  "Fund-Typ",
  "W",
  "S",
  "Risiko",
  "Status",
  "Ticket-ID",
  "Nachweis",
];

export async function generateCustomerExport(
  projectName: string,
  rows: ExportRow[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();

  // Ergebnisse sheet
  const sheet = wb.addWorksheet("Ergebnisse");
  sheet.addRow(CUSTOMER_HEADERS);

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };
  });

  for (const r of rows) {
    sheet.addRow([
      r.id,
      r.fingerprint,
      r.repo,
      r.ruleId,
      r.w,
      r.s,
      r.risiko,
      r.status,
      r.ticketId,
      r.nachweis,
    ]);
  }

  // Auto-width columns
  sheet.columns.forEach((col) => {
    let maxLen = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > maxLen) maxLen = Math.min(len, 50);
    });
    col.width = maxLen + 2;
  });

  // Zusammenfassung sheet
  const summary = wb.addWorksheet("Zusammenfassung");
  summary.addRow(["Projekt", projectName]);
  summary.addRow(["Findings gesamt", rows.length]);
  summary.addRow([]);
  summary.addRow(["Status", "Anzahl"]);

  const statusCounts: Record<string, number> = {};
  for (const r of rows) {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  }

  for (const s of [
    "found",
    "assessed",
    "in-progress",
    "rotated",
    "verified",
    "closed",
    "false-positive",
  ]) {
    if (statusCounts[s]) {
      summary.addRow([s, statusCounts[s]]);
    }
  }

  summary.getRow(1).font = { bold: true };
  summary.getRow(4).font = { bold: true };

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
