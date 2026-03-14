import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SummaryData, RepoSummary } from "@/lib/summary";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: { repos: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
  }

  const sourceRepos = project.repos.filter((r) => r.type === "source");
  const distRepos = project.repos.filter((r) => r.type === "dist");

  // Get findings grouped by repo
  const findings = await prisma.finding.findMany({
    where: { projectId: id, isDuplicate: false },
    select: {
      repoId: true,
      risiko: true,
      status: true,
      repo: { select: { name: true } },
    },
  });

  const repoMap = new Map<string, RepoSummary>();
  const statusCounts: Record<string, number> = {};

  for (const f of findings) {
    const repoName = f.repo.name;
    if (!repoMap.has(repoName)) {
      repoMap.set(repoName, {
        name: repoName,
        findings: 0,
        kritisch: 0,
        hoch: 0,
        mittel: 0,
        niedrig: 0,
      });
    }
    const rs = repoMap.get(repoName)!;
    rs.findings++;

    if (f.risiko >= 20) rs.kritisch++;
    else if (f.risiko >= 12) rs.hoch++;
    else if (f.risiko >= 6) rs.mittel++;
    else rs.niedrig++;

    statusCounts[f.status] = (statusCounts[f.status] || 0) + 1;
  }

  const repos = Array.from(repoMap.values());
  const totals = repos.reduce(
    (acc, r) => ({
      findings: acc.findings + r.findings,
      kritisch: acc.kritisch + r.kritisch,
      hoch: acc.hoch + r.hoch,
      mittel: acc.mittel + r.mittel,
      niedrig: acc.niedrig + r.niedrig,
    }),
    { findings: 0, kritisch: 0, hoch: 0, mittel: 0, niedrig: 0 }
  );

  const openCount =
    (statusCounts["found"] || 0) +
    (statusCounts["assessed"] || 0) +
    (statusCounts["in-progress"] || 0);

  const data: SummaryData = {
    projectName: project.name,
    sourceRepoCount: sourceRepos.length,
    distRepoCount: distRepos.length,
    repos,
    totals,
    statusCounts,
    openCount,
  };

  return NextResponse.json(data);
}
