import { NextRequest, NextResponse } from "next/server";
import { jobManager } from "@/lib/jobs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = jobManager.get(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job nicht gefunden" }, { status: 404 });
  }

  // cancel() may not exist on old globalThis singleton — fallback to direct mutation
  if (typeof jobManager.cancel === "function") {
    jobManager.cancel(jobId);
  } else {
    job.status = "cancelled";
    if (job.abortController) job.abortController.abort();
    jobManager.emit(jobId, "status", "Scan abgebrochen", { status: "cancelled" });
  }
  return NextResponse.json({ status: "cancelled" });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = jobManager.get(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json({
    id: job.id,
    projectId: job.projectId,
    status: job.status,
    error: job.error,
    eventCount: job.events.length,
    lastEvent: job.events[job.events.length - 1] || null,
  });
}
