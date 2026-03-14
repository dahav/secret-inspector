/**
 * Stable ID assignment via IdMapping table — port from Go internal/idmap/mapper.go
 * Instead of file-based storage, uses Prisma/DB.
 */

import { createHash } from "crypto";
import { prisma } from "./db";

/**
 * Hash a secret value to create a stable lookup key.
 * We never store raw secrets in the mapping table.
 */
export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

/**
 * Assign a stable ID to a secret for the given project.
 * Returns existing ID if the secret was seen before, otherwise creates a new one.
 */
export async function assignStableId(
  projectId: string,
  secret: string,
  prefix: string
): Promise<string> {
  const secretHash = hashSecret(secret);

  // Check existing mapping
  const existing = await prisma.idMapping.findUnique({
    where: { projectId_secretHash: { projectId, secretHash } },
  });

  if (existing) {
    return existing.stableId;
  }

  // Atomically increment project nextId and create mapping
  const project = await prisma.project.update({
    where: { id: projectId },
    data: { nextId: { increment: 1 } },
  });

  const stableId = `${prefix}-${String(project.nextId - 1).padStart(3, "0")}`;

  await prisma.idMapping.create({
    data: { projectId, secretHash, stableId },
  });

  return stableId;
}
