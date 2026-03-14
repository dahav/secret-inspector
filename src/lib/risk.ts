/**
 * Risk assessment engine — exact port from Go internal/risk/assessor.go
 */

export type RiskLevel = "HIGH" | "MEDIUM" | "LOW";
export type UsageType =
  | "test"
  | "env-template"
  | "env-config"
  | "dependency"
  | "config"
  | "infrastructure"
  | "migration"
  | "source-code";

export interface RiskAssessment {
  risk: RiskLevel;
  usageType: UsageType;
  recommendation: string;
}

export interface Score {
  w: number;
  s: number;
  risiko: number;
}

const mockPattern =
  /(?:mock|stub|fake|dummy|example|placeholder|test_|_test|phpunit|codeception)/i;

const testFilePatterns = ["test", "spec", "fixture"];
const envTemplatePatterns = [".env.dist", ".env.example", ".env.test"];
const envConfigPatterns = [".env"];
const dependencyPatterns = ["vendor/", "node_modules/"];
const configPatterns = ["config", "parameter", "setting"];
const infrastructurePatterns = ["docker", "compose"];
const migrationPatterns = ["migration"];

function containsAny(s: string, patterns: string[]): boolean {
  return patterns.some((p) => s.includes(p));
}

export function detectUsageType(filePath: string): UsageType {
  const f = filePath.toLowerCase();

  if (containsAny(f, testFilePatterns)) return "test";
  if (containsAny(f, envTemplatePatterns)) return "env-template";
  if (containsAny(f, envConfigPatterns)) return "env-config";
  if (containsAny(f, dependencyPatterns)) return "dependency";
  if (containsAny(f, configPatterns)) return "config";
  if (containsAny(f, infrastructurePatterns)) return "infrastructure";
  if (containsAny(f, migrationPatterns)) return "migration";

  return "source-code";
}

function wByUsage(u: UsageType): number {
  switch (u) {
    case "env-config":
      return 5;
    case "source-code":
      return 4;
    case "config":
    case "infrastructure":
      return 3;
    case "migration":
    case "test":
      return 2;
    default:
      return 1;
  }
}

function sByUsage(u: UsageType): number {
  switch (u) {
    case "env-config":
    case "source-code":
      return 4;
    case "config":
    case "infrastructure":
      return 3;
    default:
      return 2;
  }
}

export function computeScore(usageType: UsageType, ruleId: string): Score {
  let w = wByUsage(usageType);
  let s = sByUsage(usageType);

  const ruleL = ruleId.toLowerCase();
  if (ruleL.includes("private-key") || ruleL.includes("private_key")) {
    if (s < 5) s = 5;
  }
  if (ruleL.includes("jwt") && w < 3) {
    w = 3;
  }

  return { w, s, risiko: w * s };
}

function determineRiskLevel(
  usageType: UsageType,
  isMock: boolean,
  ruleId: string
): RiskLevel {
  let risk: RiskLevel;

  switch (usageType) {
    case "test":
      risk = isMock ? "LOW" : "MEDIUM";
      break;
    case "env-template":
      risk = "LOW";
      break;
    case "env-config":
      risk = "HIGH";
      break;
    case "dependency":
      risk = "LOW";
      break;
    case "config":
      risk = "HIGH";
      break;
    case "infrastructure":
      risk = "MEDIUM";
      break;
    case "migration":
      risk = "LOW";
      break;
    case "source-code":
      risk = "HIGH";
      break;
    default:
      risk = "MEDIUM";
  }

  if (ruleId.includes("private-key")) {
    if (risk !== "HIGH") risk = "HIGH";
  } else if (ruleId.includes("jwt")) {
    if (risk === "LOW") risk = "MEDIUM";
  }

  return risk;
}

function getRecommendation(
  usageType: UsageType,
  risk: RiskLevel,
  ruleId: string
): string {
  let recommendation: string;

  switch (usageType) {
    case "test":
      recommendation =
        risk === "LOW"
          ? "Test with mocks - probably not a real secret."
          : "Check if test runs against real endpoints.";
      break;
    case "env-template":
      recommendation =
        "Template file. Check if value is a placeholder or real secret.";
      break;
    case "env-config":
      recommendation =
        "ATTENTION: Real .env file with secret! Should NOT be in repo.";
      break;
    case "dependency":
      recommendation =
        "Vendor/Dependency - not directly controllable. Check if own secret affected.";
      break;
    case "config":
      recommendation =
        "Secret in configuration file. Check if production secret!";
      break;
    case "infrastructure":
      recommendation =
        "Infrastructure file. Check if secret relevant for production.";
      break;
    case "migration":
      recommendation = "Migration - historical entry, probably not active.";
      break;
    case "source-code":
      recommendation =
        "Hardcoded secret in source code! Must check and possibly rotate.";
      break;
    default:
      recommendation = "Review this finding.";
  }

  if (ruleId.includes("private-key")) {
    recommendation = "Private Key found. " + recommendation;
  } else if (ruleId.includes("jwt")) {
    recommendation = "JWT Token. " + recommendation;
  }

  return recommendation;
}

export function assessRisk(
  filePath: string,
  context: string,
  ruleId: string
): RiskAssessment {
  const usageType = detectUsageType(filePath);
  const isMock = mockPattern.test(context.toLowerCase());
  const risk = determineRiskLevel(usageType, isMock, ruleId);
  const recommendation = getRecommendation(usageType, risk, ruleId);

  return { risk, usageType, recommendation };
}

/** Risk level label in German */
export function riskLabel(risiko: number): string {
  if (risiko >= 20) return "Kritisch";
  if (risiko >= 12) return "Hoch";
  if (risiko >= 6) return "Mittel";
  return "Niedrig";
}

/** Overdue threshold in days */
export function overdueThreshold(risiko: number): number {
  if (risiko >= 20) return 14;
  if (risiko >= 12) return 30;
  return 60;
}
