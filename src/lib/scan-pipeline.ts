/**
 * Scan pipeline — orchestrates the full scan process for a project.
 */

import { prisma } from "./db";
import { jobManager } from "./jobs";
import { cloneOrPullRepo, repoNameFromUrl } from "./git";
import { runGitleaksScan } from "./gitleaks";
import { assignStableId } from "./idmap";
import { computeScore, detectUsageType } from "./risk";
import { findSecretInDirectoryAsync, lookupSecretAtCommitAsync } from "./search";
import { execSync } from "child_process";

interface ProjectWithRepos {
  id: string;
  name: string;
  idPrefix: string;
  repos: Array<{
    id: string;
    url: string;
    branch: string | null;
    name: string;
    type: string;
  }>;
}

const REPOS_DIR = "/tmp/repos";

export async function runScanPipeline(
  jobId: string,
  project: ProjectWithRepos,
  scanId: string
) {
  const sourceRepos = project.repos.filter((r) => r.type === "source");
  const distRepos = project.repos.filter((r) => r.type === "dist");
  const allRepos = [...sourceRepos, ...distRepos];

  // Total operations for progress calculation:
  // 1 (delete) + allRepos (clone) + sourceRepos (scan+enrich) + 1 (cleanup)
  const totalOps = 1 + allRepos.length + sourceRepos.length + 1;
  let completedOps = 0;

  function progress() {
    return Math.round((completedOps / totalOps) * 100);
  }

  function emit(type: string, message: string, extra?: Record<string, unknown>) {
    jobManager.emit(jobId, type, message, { ...extra, progress: progress() });
  }

  function checkCancelled() {
    const job = jobManager.get(jobId);
    if (job?.status === "cancelled" || job?.abortController?.signal?.aborted) {
      throw new Error("__cancelled__");
    }
  }

  try {
    jobManager.setStatus(jobId, "running");

    // Step 1: Delete old findings (keep IdMappings!)
    emit("step", "Alte Findings werden gelöscht...");
    await prisma.finding.deleteMany({ where: { projectId: project.id } });
    completedOps++;
    emit("step", "Alte Findings gelöscht");

    // Update scan status
    await prisma.scan.update({
      where: { id: scanId },
      data: { status: "running" },
    });

    // Step 2: Load SSH key if available
    const sshKey = await prisma.sshKey.findFirst({
      where: {
        OR: [{ projectId: project.id }, { projectId: null }],
      },
      orderBy: { projectId: "desc" }, // project-specific first
    });
    const privateKey = sshKey?.privateKey;

    // Step 3: Clone/Pull all repos
    for (const repo of allRepos) {
      checkCancelled();
      emit("clone", `Klone ${repo.name}...`, { repoName: repo.name });
      const result = cloneOrPullRepo(
        repo.url,
        repo.branch,
        REPOS_DIR,
        repo.name,
        privateKey || undefined
      );
      completedOps++;
      if (!result.success) {
        const isSsh = repo.url.startsWith("git@") || repo.url.includes("ssh://");
        const host = repo.url.split("@")[1]?.split(":")[0] || repo.url;
        const hint = isSsh && !privateKey
          ? ` — Kein SSH-Key hinterlegt. Bitte unter Einstellungen oder in der Projekt-Konfiguration einen SSH-Key für den Host "${host}" hinterlegen.`
          : isSsh && privateKey
            ? ` — SSH-Key vorhanden, aber Zugriff verweigert. Ist es der Private Key (nicht Public)?`
            : "";
        throw new Error(`Fehler beim Klonen von ${repo.name}${hint} (${result.error})`);
      }
      emit("clone_done", `${repo.name} geklont [${result.branch}]`);
    }

    // Step 4: Scan source repos with gitleaks + enrich
    let totalFindings = 0;

    for (const repo of sourceRepos) {
      checkCancelled();
      emit("scan", `Scanne ${repo.name}...`, { repoName: repo.name });

      const repoPath = `${REPOS_DIR}/${repo.name}`;
      const scanResult = runGitleaksScan(repoPath, repo.name);

      if (scanResult.error) {
        completedOps++;
        emit("warning", `Scan-Fehler bei ${repo.name}: ${scanResult.error}`);
        continue;
      }

      if (scanResult.count === 0) {
        completedOps++;
        emit("scan_done", `${repo.name}: Keine Findings`);
        continue;
      }

      emit("enrich", `${repo.name}: ${scanResult.count} Findings — Enrichment...`);

      // Dist directory for lookups
      const distDir = distRepos.length > 0 ? REPOS_DIR : null;

      // Cache enrichment results per unique secret
      const enrichmentCache = new Map<string, {
        distLocation: string; distEnvVar: string;
        codebaseLocation: string; codebaseEnvVar: string;
      }>();
      const seenSecrets = new Set<string>();
      let enriched = 0;

      for (const finding of scanResult.findings) {
        checkCancelled();
        enriched++;
        if (enriched % 5 === 1 || enriched === scanResult.count) {
          emit("enrich", `${repo.name}: Enrichment ${enriched}/${scanResult.count}...`);
        }
        const stableId = await assignStableId(
          project.id,
          finding.Secret,
          project.idPrefix
        );

        const isDuplicate = seenSecrets.has(finding.Secret);
        seenSecrets.add(finding.Secret);

        const usageType = detectUsageType(finding.File);
        const score = computeScore(usageType, finding.RuleID);

        // Enrichment: reuse cached results for duplicate secrets
        let distLocation = "", distEnvVar = "";
        let codebaseLocation = "", codebaseEnvVar = "";

        const cached = enrichmentCache.get(finding.Secret);
        if (cached) {
          distLocation = cached.distLocation;
          distEnvVar = cached.distEnvVar;
          codebaseLocation = cached.codebaseLocation;
          codebaseEnvVar = cached.codebaseEnvVar;
        } else {
          // Run grep lookups in parallel
          const [distResult, codebaseResult] = await Promise.all([
            distDir
              ? findSecretInDirectoryAsync(finding.Secret, distDir)
              : Promise.resolve({ location: "", envVar: "" }),
            findSecretInDirectoryAsync(finding.Secret, REPOS_DIR),
          ]);

          distLocation = distResult.location;
          distEnvVar = distResult.envVar;
          codebaseLocation = codebaseResult.location;
          codebaseEnvVar = codebaseResult.envVar;

          enrichmentCache.set(finding.Secret, {
            distLocation, distEnvVar, codebaseLocation, codebaseEnvVar,
          });
        }

        // git show is per commit/file, always run
        const gitShow = await lookupSecretAtCommitAsync(
          REPOS_DIR,
          repo.name,
          finding.Commit,
          finding.File,
          finding.Secret
        );
        const gitShowLine = gitShow.line;
        const gitShowEnvVar = gitShow.envVar;

        await prisma.finding.create({
          data: {
            projectId: project.id,
            repoId: repo.id,
            scanId,
            stableId,
            ruleId: finding.RuleID,
            description: finding.Description,
            match: finding.Match,
            secret: finding.Secret,
            file: finding.File,
            startLine: finding.StartLine,
            commit: finding.Commit,
            fingerprint: finding.Fingerprint,
            distLocation,
            distEnvVar,
            codebaseLocation,
            codebaseEnvVar,
            gitShowLine,
            gitShowEnvVar,
            usageType,
            isDuplicate,
            w: score.w,
            s: score.s,
            risiko: score.risiko,
            status: "found",
          },
        });

        totalFindings++;
      }

      completedOps++;
      emit("scan_done", `${repo.name}: ${scanResult.count} Findings verarbeitet`);
    }

    // Step 5: Cleanup temp repos
    emit("step", "Aufräumen...");
    try {
      execSync(`rm -rf ${REPOS_DIR}`, { timeout: 60000 });
    } catch {
      // ignore cleanup errors
    }
    completedOps++;

    // Update scan record
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: "completed",
        findingCount: totalFindings,
        completedAt: new Date(),
      },
    });

    emit("complete", `Scan abgeschlossen: ${totalFindings} Findings gefunden`);
    jobManager.setStatus(jobId, "completed");
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const isCancelled = errorMsg === "__cancelled__";

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: isCancelled ? "cancelled" : "error",
        errorMessage: isCancelled ? "Scan abgebrochen" : errorMsg,
        completedAt: new Date(),
      },
    });

    // Cleanup
    try {
      execSync(`rm -rf ${REPOS_DIR}`, { timeout: 60000 });
    } catch {
      // ignore
    }

    if (!isCancelled) {
      jobManager.setStatus(jobId, "error", errorMsg);
      throw err;
    }
  }
}
