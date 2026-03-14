/**
 * In-memory job manager with SSE support for scan progress.
 */

export interface JobEvent {
  type: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

export interface Job {
  id: string;
  projectId: string;
  status: "pending" | "running" | "completed" | "error" | "cancelled";
  events: JobEvent[];
  error?: string;
  createdAt: number;
  abortController: AbortController;
}

class JobManager {
  private jobs = new Map<string, Job>();
  private listeners = new Map<string, Set<(event: JobEvent) => void>>();

  create(projectId: string): Job {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const job: Job = {
      id,
      projectId,
      status: "pending",
      events: [],
      createdAt: Date.now(),
      abortController: new AbortController(),
    };
    this.jobs.set(id, job);
    return job;
  }

  get(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  emit(jobId: string, type: string, message: string, data?: Record<string, unknown>) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const event: JobEvent = { type, message, data, timestamp: Date.now() };
    job.events.push(event);

    const listeners = this.listeners.get(jobId);
    if (listeners) {
      for (const listener of listeners) {
        listener(event);
      }
    }
  }

  setStatus(jobId: string, status: Job["status"], error?: string) {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.status = status;
    if (error) job.error = error;
    this.emit(jobId, "status", error || `Job ${status}`, { status, error });
  }

  subscribe(jobId: string, listener: (event: JobEvent) => void): () => void {
    if (!this.listeners.has(jobId)) {
      this.listeners.set(jobId, new Set());
    }
    this.listeners.get(jobId)!.add(listener);

    return () => {
      this.listeners.get(jobId)?.delete(listener);
    };
  }

  cancel(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job || job.status === "completed" || job.status === "error" || job.status === "cancelled") return;
    job.abortController.abort();
    job.status = "cancelled";
    this.emit(jobId, "status", "Scan abgebrochen", { status: "cancelled" });
  }

  isCancelled(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    return job?.abortController.signal.aborted ?? false;
  }

  findActiveJob(projectId: string): Job | undefined {
    for (const job of this.jobs.values()) {
      if (job.projectId === projectId && (job.status === "running" || job.status === "pending")) {
        return job;
      }
    }
    return undefined;
  }

  /** Cleanup old jobs (>1 hour) */
  cleanup() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [id, job] of this.jobs) {
      if (job.createdAt < oneHourAgo) {
        this.jobs.delete(id);
        this.listeners.delete(id);
      }
    }
  }
}

const globalForJobs = globalThis as unknown as { jobManager: JobManager };
export const jobManager = globalForJobs.jobManager ?? new JobManager();
globalForJobs.jobManager = jobManager;
