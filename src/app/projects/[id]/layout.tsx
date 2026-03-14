"use client";
import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ScanProgress } from "@/components/scan-progress";
import { ScanContext } from "@/components/scan-context";
import { fetcher } from "@/lib/fetcher";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { id } = useParams<{ id: string }>();
  const [jobId, setJobId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Poll for active job when no job is known locally
  useSWR(
    !jobId && !pending ? `/api/projects/${id}/active-job` : null,
    fetcher,
    {
      refreshInterval: 3000,
      onSuccess: (data) => {
        if (data?.jobId) {
          setJobId(data.jobId);
          setPending(false);
        }
      },
    }
  );

  const clearJob = useCallback(() => {
    setJobId(null);
    setPending(false);
  }, []);

  const prepareScan = useCallback(() => {
    setPending(true);
  }, []);

  const startScan = useCallback((newJobId: string) => {
    setPending(false);
    setJobId(newJobId);
  }, []);

  const scanning = pending || !!jobId;

  return (
    <ScanContext.Provider value={{ scanning, prepareScan, startScan, cancelScan: clearJob }}>
      {pending && !jobId && (
        <div className="mb-6">
          <div className="rounded-lg border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-foreground">Scan wird gestartet…</span>
              </div>
              <span className="text-muted-foreground tabular-nums">0%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-blue-500 transition-all duration-500 ease-out w-0" />
            </div>
          </div>
        </div>
      )}
      {jobId && (
        <div className="mb-6">
          <ScanProgress jobId={jobId} onComplete={clearJob} onError={clearJob} onCancel={clearJob} />
        </div>
      )}
      {children}
    </ScanContext.Provider>
  );
}
