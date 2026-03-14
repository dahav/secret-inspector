import { NextResponse } from "next/server";
import { jobManager } from "@/lib/jobs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = jobManager.findActiveJob(id);
  return NextResponse.json({ jobId: job?.id ?? null });
}
