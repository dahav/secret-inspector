"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useScanContext } from "@/components/scan-context";
import { fetcher } from "@/lib/fetcher";
import { toast } from "sonner";
import { useState } from "react";

interface RotationFinding {
  id: string;
  repo: { name: string };
  distEnvVar: string;
  secret: string;
  distLocation: string;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "…";
}

export default function RotationReportPage() {
  const { id } = useParams<{ id: string }>();
  const { scanning } = useScanContext();
  const [downloading, setDownloading] = useState(false);

  const { data } = useSWR<RotationFinding[]>(
    `/api/projects/${id}/rotation`,
    fetcher
  );

  async function downloadExport() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/projects/${id}/rotation/export`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Fehler beim Export");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition");
      const filename =
        disposition?.match(/filename="(.+)"/)?.[1] || "Rotation-Report.xlsx";
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Rotation Report heruntergeladen");
    } catch {
      toast.error("Fehler beim Export");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <div className="mb-4">
        <Link
          href={`/projects/${id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Zurück zum Projekt
        </Link>
      </div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Rotation Report</h1>
          <p className="text-sm text-muted-foreground">
            Secrets die in Dist-Repos gefunden wurden — relevant für Rotation
          </p>
        </div>
        <Button
          onClick={downloadExport}
          disabled={scanning || downloading || !data || data.length === 0}
        >
          {downloading ? "Wird generiert…" : "Excel herunterladen"}
        </Button>
      </div>

      {!data ? (
        <div className="text-muted-foreground">Laden...</div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Keine Secrets in Dist-Repos gefunden.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardDescription>
                {data.length} Secret{data.length !== 1 && "s"} in Dist-Repos
                gefunden
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted border-b">
                <tr>
                  <th className="p-2 text-left">Repo</th>
                  <th className="p-2 text-left">ENV_VAR</th>
                  <th className="p-2 text-left">Secret (100)</th>
                  <th className="p-2 text-left">Dist</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((f) => (
                  <tr key={f.id} className="hover:bg-muted">
                    <td className="p-2 text-xs">{f.repo.name}</td>
                    <td className="p-2 text-xs font-mono">
                      {f.distEnvVar || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-2 text-xs font-mono break-all">
                      {truncate(f.secret, 100)}
                    </td>
                    <td className="p-2 text-xs font-mono">
                      {f.distLocation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
