/** Finding status values */
export const FINDING_STATUSES = [
  "found",
  "assessed",
  "in-progress",
  "rotated",
  "verified",
  "closed",
  "false-positive",
] as const;

export type FindingStatus = (typeof FINDING_STATUSES)[number];

/** Status display colors for charts */
export const STATUS_COLORS: Record<string, string> = {
  found: "#ef4444",
  assessed: "#f59e0b",
  "in-progress": "#3b82f6",
  rotated: "#8b5cf6",
  verified: "#10b981",
  closed: "#6b7280",
  "false-positive": "#d1d5db",
};

/** Risk level labels and thresholds */
export const RISK_LEVELS = [
  { label: "Kritisch", min: 20, color: "#dc2626" },
  { label: "Hoch", min: 12, color: "#f97316" },
  { label: "Mittel", min: 6, color: "#eab308" },
  { label: "Niedrig", min: 0, color: "#22c55e" },
] as const;

export const RISK_COLORS: Record<string, string> = Object.fromEntries(
  RISK_LEVELS.map((r) => [r.label, r.color])
);

/** Repo types */
export type RepoType = "source" | "dist";
