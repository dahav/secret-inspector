"use client";

import { Fragment, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Finding {
  id: string;
  stableId: string;
  ruleId: string;
  description: string;
  file: string;
  startLine: number;
  commit: string;
  fingerprint: string;
  secret: string;
  match: string;
  w: number;
  s: number;
  risiko: number;
  status: string;
  ticketId: string;
  nachweis: string;
  bemerkung: string;
  usageType: string;
  isDuplicate: boolean;
  distLocation: string;
  distEnvVar: string;
  codebaseLocation: string;
  gitShowLine: string;
  gitShowEnvVar: string;
  repo: { name: string; type: string };
}

interface FindingsTableProps {
  findings: Finding[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onUpdateFinding: (id: string, updates: Record<string, unknown>) => void;
}

function riskColor(risiko: number): string {
  if (risiko >= 20) return "bg-red-100 text-red-800 border-red-200";
  if (risiko >= 12) return "bg-orange-100 text-orange-800 border-orange-200";
  if (risiko >= 6) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-green-100 text-green-800 border-green-200";
}

function riskLabel(risiko: number): string {
  if (risiko >= 20) return "Kritisch";
  if (risiko >= 12) return "Hoch";
  if (risiko >= 6) return "Mittel";
  return "Niedrig";
}

function statusColor(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "found":
      return "destructive";
    case "assessed":
    case "in-progress":
      return "secondary";
    case "rotated":
    case "verified":
    case "closed":
      return "default";
    default:
      return "outline";
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "...";
}

export function FindingsTable({
  findings,
  selectedIds,
  onSelectionChange,
  onUpdateFinding,
}: FindingsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allSelected =
    findings.length > 0 && findings.every((f) => selectedIds.includes(f.id));

  function toggleAll() {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(findings.map((f) => f.id));
    }
  }

  function toggleOne(id: string) {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  }

  if (findings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Keine Findings gefunden
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted border-b">
          <tr>
            <th className="p-2 w-8">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
              />
            </th>
            <th className="p-2 text-left">ID</th>
            <th className="p-2 text-left">Repo</th>
            <th className="p-2 text-left">Fund-Typ</th>
            <th className="p-2 text-left">Datei</th>
            <th className="p-2 text-center">W</th>
            <th className="p-2 text-center">S</th>
            <th className="p-2 text-center">Risiko</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Ticket-ID</th>
            <th className="p-2 text-left">Nachweis</th>
            <th className="p-2 text-left">Bemerkung</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {findings.map((f) => (
            <Fragment key={f.id}>
            <tr
              className="hover:bg-muted cursor-pointer"
                onClick={() =>
                  setExpandedId(expandedId === f.id ? null : f.id)
                }
              >
                <td className="p-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(f.id)}
                    onChange={() => toggleOne(f.id)}
                  />
                </td>
                <td className="p-2 font-mono text-xs whitespace-nowrap">
                  {f.stableId}
                  {f.isDuplicate && (
                    <Badge variant="outline" className="ml-1 text-xs">
                      DUPL
                    </Badge>
                  )}
                </td>
                <td className="p-2 text-xs">{f.repo.name}</td>
                <td className="p-2 text-xs">{f.ruleId}</td>
                <td className="p-2 text-xs font-mono" title={f.file}>
                  {truncate(f.file, 30)}:{f.startLine}
                </td>
                <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                  <InlineNumber
                    value={f.w}
                    min={1}
                    max={5}
                    onSave={(v) => onUpdateFinding(f.id, { w: v })}
                  />
                </td>
                <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                  <InlineNumber
                    value={f.s}
                    min={1}
                    max={5}
                    onSave={(v) => onUpdateFinding(f.id, { s: v })}
                  />
                </td>
                <td className="p-2 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${riskColor(f.risiko)}`}
                  >
                    {f.risiko} ({riskLabel(f.risiko)})
                  </span>
                </td>
                <td className="p-2" onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={f.status}
                    onValueChange={(v) =>
                      onUpdateFinding(f.id, { status: v })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="found">found</SelectItem>
                      <SelectItem value="assessed">assessed</SelectItem>
                      <SelectItem value="in-progress">in-progress</SelectItem>
                      <SelectItem value="rotated">rotated</SelectItem>
                      <SelectItem value="verified">verified</SelectItem>
                      <SelectItem value="closed">closed</SelectItem>
                      <SelectItem value="false-positive">
                        false-positive
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-2" onClick={(e) => e.stopPropagation()}>
                  <InlineEdit
                    value={f.ticketId}
                    onSave={(v) => onUpdateFinding(f.id, { ticketId: v })}
                    placeholder="—"
                  />
                </td>
                <td className="p-2" onClick={(e) => e.stopPropagation()}>
                  <InlineEdit
                    value={f.nachweis}
                    onSave={(v) => onUpdateFinding(f.id, { nachweis: v })}
                    placeholder="—"
                  />
                </td>
                <td className="p-2" onClick={(e) => e.stopPropagation()}>
                  <InlineEdit
                    value={f.bemerkung}
                    onSave={(v) => onUpdateFinding(f.id, { bemerkung: v })}
                    placeholder="—"
                  />
                </td>
              </tr>
              {expandedId === f.id && (
                <tr className="bg-muted">
                  <td colSpan={12} className="p-4">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <strong>Beschreibung:</strong> {f.description}
                      </div>
                      <div>
                        <strong>Fingerprint:</strong>{" "}
                        <span className="font-mono">{truncate(f.fingerprint, 40)}</span>
                      </div>
                      <div>
                        <strong>Commit:</strong>{" "}
                        <span className="font-mono">{f.commit.slice(0, 8)}</span>
                      </div>
                      <div>
                        <strong>Usage Type:</strong> {f.usageType}
                      </div>
                      <div>
                        <strong>Match:</strong>{" "}
                        <span className="font-mono break-all">
                          {truncate(f.match, 100)}
                        </span>
                      </div>
                      <div>
                        <strong>Secret (100):</strong>{" "}
                        <span className="font-mono break-all">
                          {truncate(f.secret, 100)}
                        </span>
                      </div>
                      {f.distLocation && (
                        <div>
                          <strong>Dist:</strong> {f.distLocation}
                          {f.distEnvVar && ` (${f.distEnvVar})`}
                        </div>
                      )}
                      {f.codebaseLocation && (
                        <div>
                          <strong>Codebase:</strong> {f.codebaseLocation}
                        </div>
                      )}
                      {f.gitShowLine && (
                        <div className="col-span-2">
                          <strong>Git Show:</strong>{" "}
                          <span className="font-mono">{truncate(f.gitShowLine, 120)}</span>
                          {f.gitShowEnvVar && ` (${f.gitShowEnvVar})`}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InlineEdit({
  value,
  onSave,
  placeholder,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  if (!editing) {
    return (
      <span
        className="text-xs cursor-pointer hover:bg-muted px-1 py-0.5 rounded min-w-[2rem] inline-block"
        onClick={() => {
          setEditValue(value);
          setEditing(true);
        }}
      >
        {value || <span className="text-muted-foreground">{placeholder}</span>}
      </span>
    );
  }

  return (
    <Input
      className="h-6 text-xs w-28"
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={() => {
        if (editValue !== value) onSave(editValue);
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          if (editValue !== value) onSave(editValue);
          setEditing(false);
        }
        if (e.key === "Escape") setEditing(false);
      }}
      autoFocus
    />
  );
}

function InlineNumber({
  value,
  min,
  max,
  onSave,
}: {
  value: number;
  min: number;
  max: number;
  onSave: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));

  function commit() {
    const num = parseInt(editValue, 10);
    if (!isNaN(num) && num >= min && num <= max && num !== value) {
      onSave(num);
    }
    setEditing(false);
  }

  if (!editing) {
    return (
      <span
        className="text-xs cursor-pointer hover:bg-muted px-1 py-0.5 rounded inline-block tabular-nums"
        onClick={() => {
          setEditValue(String(value));
          setEditing(true);
        }}
      >
        {value}
      </span>
    );
  }

  return (
    <Input
      type="number"
      min={min}
      max={max}
      className="h-6 text-xs w-14 text-center"
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setEditing(false);
      }}
      autoFocus
    />
  );
}
