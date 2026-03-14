/**
 * Gitleaks execution — port from Go internal/gitleaks/runner.go
 */

import { execSync, ExecSyncOptionsWithStringEncoding } from "child_process";
import { existsSync, readFileSync, unlinkSync } from "fs";
import path from "path";
import { GitleaksFinding, cleanFindings } from "./cleanup";

export interface ScanResult {
  findings: GitleaksFinding[];
  count: number;
  error?: string;
}

/** Get installed gitleaks version */
export function gitleaksVersion(): string {
  try {
    return execSync("gitleaks version", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

/** Get current git branch of a repo */
export function gitBranch(repoPath: string): string {
  try {
    return execSync(`git -C '${repoPath}' rev-parse --abbrev-ref HEAD`, {
      encoding: "utf-8",
    }).trim();
  } catch {
    return "";
  }
}

/** Run gitleaks scan on a repo, return cleaned findings */
export function runGitleaksScan(
  repoPath: string,
  repoName: string
): ScanResult {
  const outputPath = path.join("/tmp", `gitleaks_${repoName}.json`);

  try {
    const args = [
      "detect",
      "--source",
      repoPath,
      "--report-path",
      outputPath,
      "--report-format",
      "json",
      "--exit-code",
      "0",
    ];

    // Use repo-local .gitleaks.toml if present
    const configPath = path.join(repoPath, ".gitleaks.toml");
    if (existsSync(configPath)) {
      args.push("--config", configPath);
    }

    const opts: ExecSyncOptionsWithStringEncoding = {
      encoding: "utf-8",
      timeout: 600000, // 10 minutes
      stdio: ["pipe", "pipe", "pipe"],
    };

    execSync(`gitleaks ${args.map((a) => `'${a}'`).join(" ")}`, opts);

    // Parse results
    if (!existsSync(outputPath)) {
      return { findings: [], count: 0 };
    }

    const raw = readFileSync(outputPath, "utf-8");
    try {
      unlinkSync(outputPath);
    } catch {
      // ignore cleanup error
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>[];
    const findings = cleanFindings(parsed);

    return { findings, count: findings.length };
  } catch (err) {
    return {
      findings: [],
      count: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
