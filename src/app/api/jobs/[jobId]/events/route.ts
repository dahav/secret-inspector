import { NextRequest } from "next/server";
import { jobManager } from "@/lib/jobs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = jobManager.get(jobId);

  if (!job) {
    return new Response("Job nicht gefunden", { status: 404 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send existing events
      for (const event of job.events) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      }

      // If already done, close
      if (job.status === "completed" || job.status === "error" || job.status === "cancelled") {
        controller.close();
        return;
      }

      // Subscribe to new events
      const unsubscribe = jobManager.subscribe(jobId, (event) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
          if (event.type === "status" && (event.data?.status === "completed" || event.data?.status === "error" || event.data?.status === "cancelled")) {
            controller.close();
            unsubscribe();
          }
        } catch {
          unsubscribe();
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
