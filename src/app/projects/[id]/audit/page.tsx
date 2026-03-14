"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { useScanContext } from "@/components/scan-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FindingsTable } from "@/components/findings-table";
import { fetcher } from "@/lib/fetcher";
import { useState, useCallback } from "react";

export default function AuditPage() {
  const { id } = useParams<{ id: string }>();
  const { scanning } = useScanContext();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [risikoFilter, setRisikoFilter] = useState<string>("all");
  const [repoFilter, setRepoFilter] = useState<string>("all");
  const [deduplicate, setDeduplicate] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", "50");
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (risikoFilter !== "all") params.set("risiko", risikoFilter);
  if (repoFilter !== "all") params.set("repoId", repoFilter);
  if (deduplicate) params.set("deduplicate", "true");

  const { data, mutate } = useSWR(
    `/api/projects/${id}/findings?${params}`,
    fetcher
  );
  const { data: repos } = useSWR(`/api/projects/${id}/repos`, fetcher);

  const handleUpdateFinding = useCallback(
    async (findingId: string, updates: Record<string, unknown>) => {
      await fetch(`/api/projects/${id}/findings/${findingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      mutate();
      toast.success("Gespeichert");
    },
    [id, mutate]
  );

  async function batchUpdate(updates: Record<string, unknown>) {
    if (selectedIds.length === 0) {
      toast.error("Keine Findings ausgewählt");
      return;
    }
    await fetch(`/api/projects/${id}/findings/batch`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ findingIds: selectedIds, updates }),
    });
    setSelectedIds([]);
    mutate();
    toast.success(`${selectedIds.length} Findings aktualisiert`);
  }

  return (
    <div>
      <div className="mb-4">
        <Link href={`/projects/${id}`} className="text-sm text-muted-foreground hover:text-foreground">&larr; Zurück zum Projekt</Link>
      </div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Audit-Tabelle</h1>
        {data && (
          <Badge variant="outline">
            {data.total} Findings (Seite {data.page}/{data.totalPages})
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap items-end">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Status</label>
          <Select value={statusFilter} onValueChange={(v) => { if (v) { setStatusFilter(v); setPage(1); } }}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="found">Found</SelectItem>
              <SelectItem value="assessed">Assessed</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="rotated">Rotated</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="false-positive">False Positive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">Risiko</label>
          <Select value={risikoFilter} onValueChange={(v) => { if (v) { setRisikoFilter(v); setPage(1); } }}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="kritisch">Kritisch</SelectItem>
              <SelectItem value="hoch">Hoch</SelectItem>
              <SelectItem value="mittel">Mittel</SelectItem>
              <SelectItem value="niedrig">Niedrig</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">Repository</label>
          <Select value={repoFilter} onValueChange={(v) => { if (v) { setRepoFilter(v); setPage(1); } }}>
            <SelectTrigger className="w-48">
              <SelectValue>
                {repoFilter === "all"
                  ? "Alle"
                  : repos?.find((r: { id: string; name: string }) => r.id === repoFilter)?.name ?? repoFilter}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              {repos?.filter((repo: { id: string; name: string; type: string }) => repo.type === "source").map((repo: { id: string; name: string }) => (
                <SelectItem key={repo.id} value={repo.id}>
                  {repo.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="dedup"
            checked={deduplicate}
            onChange={(e) => { setDeduplicate(e.target.checked); setPage(1); }}
          />
          <label htmlFor="dedup" className="text-sm">
            Deduplizieren
          </label>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex gap-2 ml-auto">
            <Badge>{selectedIds.length} ausgewählt</Badge>
            <Select
              onValueChange={(v) => { if (v) batchUpdate({ status: v }); }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status setzen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="found">Found</SelectItem>
                <SelectItem value="assessed">Assessed</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="rotated">Rotated</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="false-positive">False Positive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Table */}
      {data && (
        <FindingsTable
          findings={data.findings}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onUpdateFinding={handleUpdateFinding}
        />
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={scanning || page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Zurück
          </Button>
          <span className="px-3 py-1 text-sm">
            Seite {page} von {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={scanning || page >= data.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Weiter
          </Button>
        </div>
      )}
    </div>
  );
}
