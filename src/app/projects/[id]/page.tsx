"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useScanContext } from "@/components/scan-context";
import { fetcher } from "@/lib/fetcher";

export default function ProjectOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const { scanning, prepareScan, startScan, cancelScan } = useScanContext();
  const { data: project, mutate } = useSWR(`/api/projects/${id}`, fetcher);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!project) return <div className="text-muted-foreground">Laden...</div>;

  const sourceRepos = project.repos?.filter(
    (r: { type: string }) => r.type === "source"
  );
  const distRepos = project.repos?.filter(
    (r: { type: string }) => r.type === "dist"
  );
  const lastScan = project.scans?.[0];
  const hasCompletedScan = project.scans?.some(
    (s: { status: string }) => s.status === "completed"
  );

  async function handleStartScan() {
    setShowConfirm(false);
    prepareScan();
    try {
      const res = await fetch(`/api/projects/${id}/scan`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        cancelScan();
        alert(`Fehler: ${err.error}`);
        return;
      }
      const data = await res.json();
      startScan(data.jobId);
    } catch {
      cancelScan();
      alert("Fehler beim Starten des Scans");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">Prefix: {project.idPrefix}</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowConfirm(true)}
            disabled={scanning || sourceRepos?.length === 0}
          >
            {scanning ? "Scan läuft..." : "Scan starten"}
          </Button>
          <Link href={`/projects/${id}/config`}>
            <Button variant="outline">Konfiguration</Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Source-Repos</CardDescription>
            <CardTitle className="text-2xl">{sourceRepos?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Dist-Repos</CardDescription>
            <CardTitle className="text-2xl">{distRepos?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Findings</CardDescription>
            <CardTitle className="text-2xl">{project._count?.findings || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Letzter Scan</CardDescription>
            <CardTitle className="text-sm">
              {lastScan
                ? new Date(lastScan.completedAt || lastScan.startedAt).toLocaleString("de-DE")
                : "Noch kein Scan"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Navigation Cards */}
      {(!hasCompletedScan || scanning) && (
        <p className="text-sm text-muted-foreground mb-2">
          {scanning
            ? "Reports sind während eines laufenden Scans nicht verfügbar."
            : "Reports sind verfügbar, sobald ein Scan abgeschlossen ist."}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { href: "audit", title: "Audit-Tabelle", desc: "Findings anzeigen und bewerten" },
          { href: "status", title: "Status-Dashboard", desc: "Verteilung nach Status und Risiko" },
          { href: "summary", title: "Zusammenfassung", desc: "Dokumentations-Zusammenfassung" },
          { href: "rotation", title: "Rotation Report", desc: "Secrets in Dist-Repos — für Rotation" },
          { href: "export", title: "Export", desc: "Kunden-Report generieren" },
        ].map((item) =>
          hasCompletedScan && !scanning ? (
            <Link key={item.href} href={`/projects/${id}/${item.href}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription>{item.desc}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ) : (
            <Card key={item.href} className="opacity-50 pointer-events-none">
              <CardHeader>
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription>{item.desc}</CardDescription>
              </CardHeader>
            </Card>
          )
        )}
      </div>

      {/* Confirm Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan starten?</DialogTitle>
            <DialogDescription>
              Alle bestehenden Findings dieses Projekts werden gelöscht und durch
              neue Scan-Ergebnisse ersetzt. Die stabilen IDs (IdMappings) bleiben
              erhalten.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleStartScan}>Scan starten</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
