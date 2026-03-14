/**
 * Summary generation — port from Go cmd/summary.go
 */

export interface RepoSummary {
  name: string;
  findings: number;
  kritisch: number;
  hoch: number;
  mittel: number;
  niedrig: number;
}

export interface SummaryData {
  projectName: string;
  sourceRepoCount: number;
  distRepoCount: number;
  repos: RepoSummary[];
  totals: {
    findings: number;
    kritisch: number;
    hoch: number;
    mittel: number;
    niedrig: number;
  };
  statusCounts: Record<string, number>;
  openCount: number;
}

export function generateSummaryMarkdown(data: SummaryData): string {
  const lines: string[] = [];

  lines.push(`# ${data.projectName} — Zusammenfassung\n`);

  // Methodik
  lines.push("## Methodik\n");
  lines.push("- **Tool:** gitleaks (automatisierte Secret-Erkennung)");
  lines.push(
    "- **Scan-Typ:** Git-History-Scan aller konfigurierten Repositories"
  );
  lines.push(
    `- **Anzahl Repositories:** ${data.sourceRepoCount} (Source) + ${data.distRepoCount} (Distribution)`
  );
  lines.push(
    "- **Bewertung:** Wahrscheinlichkeit (W) x Schwere (S) = Risiko"
  );
  lines.push("- **ID-Schema:** Stabile IDs ueber alle Audit-Laeufe hinweg\n");

  // Per-repo overview
  lines.push("## Findings pro Repository\n");
  lines.push(
    "| Repository | Findings | Kritisch | Hoch | Mittel | Niedrig |"
  );
  lines.push("|:---|---:|---:|---:|---:|---:|");

  for (const r of data.repos) {
    lines.push(
      `| ${r.name} | ${r.findings} | ${r.kritisch} | ${r.hoch} | ${r.mittel} | ${r.niedrig} |`
    );
  }

  const t = data.totals;
  lines.push(
    `| **Gesamt** | **${t.findings}** | **${t.kritisch}** | **${t.hoch}** | **${t.mittel}** | **${t.niedrig}** |\n`
  );

  // Risk distribution
  lines.push("## Risikoverteilung\n");
  lines.push(`- Kritisch (Risiko >= 20): ${t.kritisch}`);
  lines.push(`- Hoch (Risiko 12-19): ${t.hoch}`);
  lines.push(`- Mittel (Risiko 6-11): ${t.mittel}`);
  lines.push(`- Niedrig (Risiko 1-5): ${t.niedrig}\n`);

  // Remediation progress
  lines.push("## Remediation-Fortschritt\n");
  lines.push("| Status | Anzahl |");
  lines.push("|:---|---:|");
  const sortedStatuses = Object.keys(data.statusCounts).sort();
  for (const s of sortedStatuses) {
    lines.push(`| ${s} | ${data.statusCounts[s]} |`);
  }
  lines.push("");

  // Open risks
  if (data.openCount > 0) {
    lines.push("## Offene Risiken\n");
    lines.push(
      `**${data.openCount} Findings** befinden sich noch in Bearbeitung (found/assessed/in-progress).\n`
    );
  }

  return lines.join("\n");
}
