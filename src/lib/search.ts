/**
 * Secret search in directories — port from Go internal/search/finder.go
 */

import { execSync, exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
import { readFileSync } from "fs";
import path from "path";

const MIN_SEARCHABLE_LENGTH = 16;

const reEnvAssignment = /^\s*['"`]?([A-Z_][A-Z0-9_]{2,})['"`]?\s*[:=]/;
const reEnvNameField = /^\s*-?\s*name\s*:\s*['"`]?([A-Z_][A-Z0-9_]{2,})['"`]?/;

export interface DistResult {
  location: string;
  envVar: string;
}

export interface GitShowResult {
  line: string;
  envVar: string;
}

function extractSearchNeedle(secret: string): string {
  const normalized = secret.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.trim().split("\n");

  if (lines.length === 1) {
    return lines[0].length >= MIN_SEARCHABLE_LENGTH ? lines[0] : "";
  }

  // Multi-line: try middle line first, then other inner lines
  const mid = Math.floor(lines.length / 2);
  const candidates = [mid];
  for (let i = 1; i < lines.length - 1; i++) {
    if (i !== mid) candidates.push(i);
  }

  for (const idx of candidates) {
    const line = lines[idx].trim();
    if (line.length >= MIN_SEARCHABLE_LENGTH && !line.startsWith("-----")) {
      return line;
    }
  }

  return "";
}

function indentDepth(s: string): number {
  const trimmed = s.replace(/^[ \t]+/, "");
  return s.length - trimmed.length;
}

export function extractEnvVarFromLines(
  lines: string[],
  lineNo: number
): string {
  if (lineNo < 1 || lineNo > lines.length) return "";

  const matchLine = lines[lineNo - 1];
  const m1 = reEnvAssignment.exec(matchLine);
  if (m1) return m1[1];

  // Walk backwards for multi-line values
  const matchIndent = indentDepth(matchLine);
  for (let i = lineNo - 2; i >= 0; i--) {
    const line = lines[i];
    if (line.trim() === "") continue;
    if (indentDepth(line) < matchIndent) {
      const m2 = reEnvAssignment.exec(line);
      if (m2) return m2[1];
      const m3 = reEnvNameField.exec(line);
      if (m3) return m3[1];
      break;
    }
    const m4 = reEnvNameField.exec(line);
    if (m4) return m4[1];
  }

  return "";
}

export function extractEnvVarFromFile(
  filePath: string,
  lineNo: number
): string {
  try {
    const data = readFileSync(filePath, "utf-8");
    return extractEnvVarFromLines(data.split("\n"), lineNo);
  } catch {
    return "";
  }
}

function buildLocationString(filePath: string, lineNoStr: string): string {
  const slashIdx = filePath.indexOf("/");
  if (slashIdx < 0) return filePath + ":" + lineNoStr;
  return (
    filePath.substring(0, slashIdx) +
    ":" +
    filePath.substring(slashIdx + 1) +
    ":" +
    lineNoStr
  );
}

export function findSecretInDirectory(secret: string, dir: string): DistResult {
  const needle = extractSearchNeedle(secret);
  if (!needle) return { location: "", envVar: "" };

  try {
    const out = execSync(
      `grep -rF -m 1 -n ${escapeShellArg(needle)} ${escapeShellArg(dir)}`,
      { timeout: 30000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );

    return parseGrepResult(out, dir);
  } catch {
    return { location: "", envVar: "" };
  }
}

export async function findSecretInDirectoryAsync(secret: string, dir: string): Promise<DistResult> {
  const needle = extractSearchNeedle(secret);
  if (!needle) return { location: "", envVar: "" };

  try {
    const { stdout } = await execAsync(
      `grep -rF -m 1 -n ${escapeShellArg(needle)} ${escapeShellArg(dir)}`,
      { timeout: 30000, encoding: "utf-8" }
    );

    return parseGrepResult(stdout, dir);
  } catch {
    return { location: "", envVar: "" };
  }
}

function parseGrepResult(out: string, dir: string): DistResult {
  if (!out.trim()) return { location: "", envVar: "" };

  const firstLine = out.trim().split("\n")[0];
  const relPath = firstLine.startsWith(dir + "/")
    ? firstLine.substring(dir.length + 1)
    : firstLine;

  const parts = relPath.split(":");
  if (parts.length < 2) return { location: relPath, envVar: "" };

  const filePath = parts[0];
  const lineNoStr = parts[1];
  const location = buildLocationString(filePath, lineNoStr);

  let envVar = "";
  const lineNo = parseInt(lineNoStr, 10);
  if (!isNaN(lineNo)) {
    envVar = extractEnvVarFromFile(path.join(dir, filePath), lineNo);
  }

  return { location, envVar };
}

function escapeShellArg(arg: string): string {
  return "'" + arg.replace(/'/g, "'\\''") + "'";
}

function truncateToRunes(s: string, maxRunes: number): string {
  const runes = [...s];
  if (runes.length > maxRunes) return runes.slice(0, maxRunes).join("");
  return s;
}

function firstLineOf(s: string): string {
  const idx = s.indexOf("\n");
  if (idx >= 0) return s.substring(0, idx).trim();
  return s.trim();
}

export function lookupSecretAtCommit(
  reposDir: string,
  repoName: string,
  commit: string,
  file: string,
  secret: string
): GitShowResult {
  if (!commit) return { line: "", envVar: "" };

  const repoPath = path.join(reposDir, repoName);
  try {
    const out = execSync(
      `git -C ${escapeShellArg(repoPath)} show ${escapeShellArg(commit + ":" + file)}`,
      { timeout: 30000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );

    return parseGitShowResult(out, secret);
  } catch {
    return { line: "", envVar: "" };
  }
}

export async function lookupSecretAtCommitAsync(
  reposDir: string,
  repoName: string,
  commit: string,
  file: string,
  secret: string
): Promise<GitShowResult> {
  if (!commit) return { line: "", envVar: "" };

  const repoPath = path.join(reposDir, repoName);
  try {
    const { stdout } = await execAsync(
      `git -C ${escapeShellArg(repoPath)} show ${escapeShellArg(commit + ":" + file)}`,
      { timeout: 30000, encoding: "utf-8" }
    );

    return parseGitShowResult(stdout, secret);
  } catch {
    return { line: "", envVar: "" };
  }
}

function parseGitShowResult(out: string, secret: string): GitShowResult {
  if (!out) return { line: "", envVar: "" };

  const needle = firstLineOf(truncateToRunes(secret, 100));
  if (!needle) return { line: "", envVar: "" };

  const lines = out.split("\n");
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    if (lines[lineIdx].includes(needle)) {
      return {
        line: lines[lineIdx].trim(),
        envVar: extractEnvVarFromLines(lines, lineIdx + 1),
      };
    }
  }

  return { line: "", envVar: "" };
}
