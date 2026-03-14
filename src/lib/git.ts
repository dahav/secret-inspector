/**
 * Git clone/pull operations — port from Go cmd/clone.go
 */

import { execSync } from "child_process";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  unlinkSync,
  chmodSync,
} from "fs";
import path from "path";

export interface CloneResult {
  success: boolean;
  branch: string;
  error?: string;
}

function isGitRepo(repoPath: string): boolean {
  return existsSync(path.join(repoPath, ".git"));
}

function currentBranch(dest: string): string {
  try {
    return execSync(`git -C '${dest}' rev-parse --abbrev-ref HEAD`, {
      encoding: "utf-8",
    }).trim();
  } catch {
    return "";
  }
}

/**
 * Setup SSH environment for git operations.
 * Returns a cleanup function that removes the temp key file.
 */
function setupSshEnv(privateKey: string): {
  env: NodeJS.ProcessEnv;
  cleanup: () => void;
} {
  const tmpKeyPath = `/tmp/ssh_key_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  writeFileSync(tmpKeyPath, privateKey, { mode: 0o600 });
  chmodSync(tmpKeyPath, 0o600);

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_SSH_COMMAND: `ssh -i ${tmpKeyPath} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null`,
  };

  return {
    env,
    cleanup: () => {
      try {
        unlinkSync(tmpKeyPath);
      } catch {
        // ignore
      }
    },
  };
}

/**
 * Clone or pull a repository.
 */
export function cloneOrPullRepo(
  url: string,
  branch: string | null,
  destDir: string,
  repoName: string,
  privateKey?: string
): CloneResult {
  const dest = path.join(destDir, repoName);
  mkdirSync(destDir, { recursive: true });

  const sshSetup = privateKey ? setupSshEnv(privateKey) : null;
  const env: NodeJS.ProcessEnv = sshSetup?.env ?? {
    ...process.env,
    GIT_SSH_COMMAND: "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null",
  };
  const execOpts: import("child_process").ExecSyncOptionsWithStringEncoding = {
    encoding: "utf-8",
    timeout: 300000, // 5 min
    stdio: ["pipe", "pipe", "pipe"],
    env,
  };

  try {
    if (isGitRepo(dest)) {
      // Pull
      const pullArgs = branch ? `pull origin ${branch}` : "pull";
      execSync(`git -C '${dest}' ${pullArgs}`, execOpts);
      return { success: true, branch: currentBranch(dest) };
    } else {
      // Clone
      const branchArg = branch ? `--branch '${branch}'` : "";
      execSync(`git clone ${branchArg} '${url}' '${dest}'`, execOpts);
      return { success: true, branch: currentBranch(dest) };
    }
  } catch (err) {
    return {
      success: false,
      branch: "",
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    sshSetup?.cleanup();
  }
}

/**
 * Remove a cloned repo directory.
 */
export function cleanupRepo(destDir: string, repoName: string): void {
  const dest = path.join(destDir, repoName);
  try {
    execSync(`rm -rf '${dest}'`, { timeout: 30000 });
  } catch {
    // ignore
  }
}

/**
 * Extract repo name from URL (basename without .git).
 */
export function repoNameFromUrl(url: string): string {
  const parts = url.split("/");
  const last = parts[parts.length - 1];
  return last.replace(/\.git$/, "");
}
