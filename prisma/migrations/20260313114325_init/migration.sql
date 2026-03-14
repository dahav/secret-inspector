-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "idPrefix" TEXT NOT NULL,
    "nextId" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Repo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "branch" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    CONSTRAINT "Repo_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "repoNames" TEXT NOT NULL,
    CONSTRAINT "Group_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SshKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "projectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SshKey_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Scan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "findingCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "Scan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "stableId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "match" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "file" TEXT NOT NULL,
    "startLine" INTEGER NOT NULL,
    "commit" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "distLocation" TEXT NOT NULL DEFAULT '',
    "distEnvVar" TEXT NOT NULL DEFAULT '',
    "codebaseLocation" TEXT NOT NULL DEFAULT '',
    "codebaseEnvVar" TEXT NOT NULL DEFAULT '',
    "gitShowLine" TEXT NOT NULL DEFAULT '',
    "gitShowEnvVar" TEXT NOT NULL DEFAULT '',
    "usageType" TEXT NOT NULL DEFAULT '',
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "w" INTEGER NOT NULL DEFAULT 0,
    "s" INTEGER NOT NULL DEFAULT 0,
    "risiko" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'found',
    "ticketId" TEXT NOT NULL DEFAULT '',
    "nachweis" TEXT NOT NULL DEFAULT '',
    "remediationType" TEXT NOT NULL DEFAULT '',
    "bemerkung" TEXT NOT NULL DEFAULT '',
    "falsePositive" BOOLEAN NOT NULL DEFAULT false,
    "assessmentUpdatedAt" DATETIME,
    "assessmentUpdatedBy" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "Finding_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Finding_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Finding_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IdMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "stableId" TEXT NOT NULL,
    CONSTRAINT "IdMapping_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Repo_projectId_url_key" ON "Repo"("projectId", "url");

-- CreateIndex
CREATE UNIQUE INDEX "IdMapping_projectId_secretHash_key" ON "IdMapping"("projectId", "secretHash");
