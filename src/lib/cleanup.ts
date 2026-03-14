/**
 * Noise cleanup from gitleaks JSON — port from Go internal/cleanup/cleaner.go
 */

const DEFAULT_KEYS = [
  "EndLine",
  "StartColumn",
  "EndColumn",
  "Entropy",
  "Link",
  "SymlinkFile",
  "Author",
  "Email",
  "Date",
  "Message",
  "Tags",
];

export interface GitleaksFinding {
  RuleID: string;
  Description: string;
  Match: string;
  Secret: string;
  File: string;
  StartLine: number;
  Commit: string;
  Fingerprint: string;
  [key: string]: unknown;
}

/**
 * Clean gitleaks JSON output by removing noise keys.
 * Returns cleaned findings array.
 */
export function cleanFindings(
  raw: Record<string, unknown>[],
  keysToDelete: string[] = DEFAULT_KEYS
): GitleaksFinding[] {
  const keySet = new Set(keysToDelete.map((k) => k.toLowerCase()));

  return raw.map((obj) => {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (!keySet.has(key.toLowerCase())) {
        cleaned[key] = value;
      }
    }
    return cleaned as GitleaksFinding;
  });
}
