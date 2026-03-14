"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetcher } from "@/lib/fetcher";

export default function SummaryPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useSWR(`/api/projects/${id}/summary`, fetcher);

  if (!data) return <div className="text-muted-foreground">Laden...</div>;

  return (
    <div>
      <div className="mb-4">
        <Link href={`/projects/${id}`} className="text-sm text-muted-foreground hover:text-foreground">&larr; Zurück zum Projekt</Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">Zusammenfassung</h1>

      {/* Methodik */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Methodik</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>
            <strong>Tool:</strong> gitleaks (automatisierte Secret-Erkennung)
          </p>
          <p>
            <strong>Scan-Typ:</strong> Git-History-Scan aller konfigurierten
            Repositories
          </p>
          <p>
            <strong>Anzahl Repositories:</strong> {data.sourceRepoCount}{" "}
            (Source) + {data.distRepoCount} (Distribution)
          </p>
          <p>
            <strong>Bewertung:</strong> Wahrscheinlichkeit (W) x Schwere (S) =
            Risiko
          </p>
          <p>
            <strong>ID-Schema:</strong> Stabile IDs über alle Audit-Läufe hinweg
          </p>
        </CardContent>
      </Card>

      {/* Per-Repo Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Findings pro Repository</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted border-b">
                <tr>
                  <th className="p-2 text-left">Repository</th>
                  <th className="p-2 text-right">Findings</th>
                  <th className="p-2 text-right text-red-600">Kritisch</th>
                  <th className="p-2 text-right text-orange-600">Hoch</th>
                  <th className="p-2 text-right text-yellow-600">Mittel</th>
                  <th className="p-2 text-right text-green-600">Niedrig</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.repos?.map(
                  (r: {
                    name: string;
                    findings: number;
                    kritisch: number;
                    hoch: number;
                    mittel: number;
                    niedrig: number;
                  }) => (
                    <tr key={r.name}>
                      <td className="p-2">{r.name}</td>
                      <td className="p-2 text-right">{r.findings}</td>
                      <td className="p-2 text-right font-bold text-red-600">
                        {r.kritisch || "—"}
                      </td>
                      <td className="p-2 text-right font-bold text-orange-600">
                        {r.hoch || "—"}
                      </td>
                      <td className="p-2 text-right font-bold text-yellow-600">
                        {r.mittel || "—"}
                      </td>
                      <td className="p-2 text-right font-bold text-green-600">
                        {r.niedrig || "—"}
                      </td>
                    </tr>
                  )
                )}
                <tr className="font-bold bg-muted">
                  <td className="p-2">Gesamt</td>
                  <td className="p-2 text-right">{data.totals?.findings}</td>
                  <td className="p-2 text-right text-red-600">
                    {data.totals?.kritisch}
                  </td>
                  <td className="p-2 text-right text-orange-600">
                    {data.totals?.hoch}
                  </td>
                  <td className="p-2 text-right text-yellow-600">
                    {data.totals?.mittel}
                  </td>
                  <td className="p-2 text-right text-green-600">
                    {data.totals?.niedrig}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Risk Distribution */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Risikoverteilung</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>
            Kritisch (Risiko &ge; 20): <strong>{data.totals?.kritisch}</strong>
          </p>
          <p>
            Hoch (Risiko 12-19): <strong>{data.totals?.hoch}</strong>
          </p>
          <p>
            Mittel (Risiko 6-11): <strong>{data.totals?.mittel}</strong>
          </p>
          <p>
            Niedrig (Risiko 1-5): <strong>{data.totals?.niedrig}</strong>
          </p>
        </CardContent>
      </Card>

      {/* Remediation Progress */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Remediation-Fortschritt</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="text-sm">
            <thead className="bg-muted border-b">
              <tr>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-right">Anzahl</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Object.entries(data.statusCounts || {})
                .filter(([, count]) => (count as number) > 0)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([status, count]) => (
                  <tr key={status}>
                    <td className="p-2">{status}</td>
                    <td className="p-2 text-right">{count as number}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Open Risks */}
      {data.openCount > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle>Offene Risiken</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              <strong>{data.openCount} Findings</strong> befinden sich noch in
              Bearbeitung (found/assessed/in-progress).
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
