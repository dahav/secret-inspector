"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useScanContext } from "@/components/scan-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export default function ExportPage() {
  const { id } = useParams<{ id: string }>();
  const { scanning } = useScanContext();
  const [loading, setLoading] = useState(false);

  async function downloadExport() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${id}/export`, {
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
        disposition?.match(/filename="(.+)"/)?.[1] || "Report.xlsx";
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export heruntergeladen");
    } catch {
      toast.error("Fehler beim Export");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <div className="mb-4">
        <Link href={`/projects/${id}`} className="text-sm text-muted-foreground hover:text-foreground">&larr; Zurück zum Projekt</Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">Kunden-Report</h1>

      <Card>
        <CardHeader>
          <CardTitle>Excel-Export</CardTitle>
          <CardDescription>
            Generiert einen Kunden-Report als .xlsx-Datei. Der Report enthält
            keine Secrets, sondern nur IDs, Risikobewertungen und
            Remediation-Status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Der Report enthält:</p>
            <ul className="list-disc list-inside ml-2">
              <li>Ergebnisse: Alle Findings (dedupliziert)</li>
              <li>Zusammenfassung: Projektinfo und Status-Verteilung</li>
            </ul>
          </div>
          <Button onClick={downloadExport} disabled={scanning || loading}>
            {loading ? "Wird generiert..." : "Report herunterladen"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
