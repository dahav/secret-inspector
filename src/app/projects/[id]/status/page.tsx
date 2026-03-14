"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { fetcher } from "@/lib/fetcher";

const STATUS_COLORS: Record<string, string> = {
  found: "#ef4444",
  assessed: "#f59e0b",
  "in-progress": "#3b82f6",
  rotated: "#8b5cf6",
  verified: "#10b981",
  closed: "#6b7280",
  "false-positive": "#d1d5db",
};

const RISK_COLORS = {
  Kritisch: "#dc2626",
  Hoch: "#f97316",
  Mittel: "#eab308",
  Niedrig: "#22c55e",
};

export default function StatusDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useSWR(`/api/projects/${id}/status`, fetcher);

  if (!data) return <div className="text-muted-foreground">Laden...</div>;

  const statusData = Object.entries(data.statusCounts)
    .filter(([, count]) => (count as number) > 0)
    .map(([name, value]) => ({ name, value }));

  const riskData = [
    { name: "Kritisch", value: data.riskCounts.kritisch },
    { name: "Hoch", value: data.riskCounts.hoch },
    { name: "Mittel", value: data.riskCounts.mittel },
    { name: "Niedrig", value: data.riskCounts.niedrig },
  ].filter((d) => d.value > 0);

  return (
    <div>
      <div className="mb-4">
        <Link href={`/projects/${id}`} className="text-sm text-muted-foreground hover:text-foreground">&larr; Zurück zum Projekt</Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">Status-Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Findings gesamt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.total}</div>
          </CardContent>
        </Card>
        <Card className={data.overdue > 0 ? "border-red-300" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Überfällig</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold ${data.overdue > 0 ? "text-red-600" : ""}`}
            >
              {data.overdue}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Remediation intern
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.remediationCounts.intern}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Remediation extern
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.remediationCounts.extern}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Verteilung nach Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" name="Anzahl">
                    {statusData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_COLORS[entry.name] || "#6b7280"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Keine Daten
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verteilung nach Risiko</CardTitle>
          </CardHeader>
          <CardContent>
            {riskData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={riskData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {riskData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          RISK_COLORS[
                            entry.name as keyof typeof RISK_COLORS
                          ] || "#6b7280"
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Keine Daten
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue info */}
      {data.overdue > 0 && (
        <Card className="mt-6 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">
              Überfällige Findings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              <strong>{data.overdue}</strong> Findings haben die
              Bearbeitungsfrist überschritten.
            </p>
            <ul className="text-xs text-muted-foreground mt-2 space-y-1">
              <li>Kritisch (Risiko &ge; 20): 14 Tage</li>
              <li>Hoch (Risiko 12-19): 30 Tage</li>
              <li>Mittel/Niedrig: 60 Tage</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
