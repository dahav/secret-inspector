import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jobManager } from "@/lib/jobs";
import { runScanPipeline } from "@/lib/scan-pipeline";

export async function POST(
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

  if (project.repos.filter((r) => r.type === "source").length === 0) {
    return NextResponse.json(
      { error: "Keine Source-Repos konfiguriert" },
      { status: 400 }
    );
  }

  // Create job
  const job = jobManager.create(id);

  // Create scan record
  const scan = await prisma.scan.create({
    data: {
      projectId: id,
      status: "pending",
      startedAt: new Date(),
    },
  });

  // Run pipeline async (error handling is inside the pipeline)
  runScanPipeline(job.id, project, scan.id).catch((err) => {
    console.error("Scan pipeline error:", err);
  });

  return NextResponse.json({ jobId: job.id, scanId: scan.id }, { status: 202 });
}
