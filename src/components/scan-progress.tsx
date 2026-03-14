"use client";

import { useEffect, useRef, useState } from "react";

interface ScanProgressProps {
  jobId: string;
  onComplete: () => void;
  onError?: () => void;
  onCancel?: () => void;
}

interface JobEvent {
  type: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

export function ScanProgress({ jobId, onComplete, onError, onCancel }: ScanProgressProps) {
  const [currentMessage, setCurrentMessage] = useState("Scan wird gestartet…");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"connecting" | "running" | "completed" | "error" | "cancelled">("connecting");
  const [cancelling, setCancelling] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  const doneRef = useRef(false);

  async function handleCancel() {
    setCancelling(true);
    try {
      await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    doneRef.current = false;
    setCurrentMessage("Scan wird gestartet…");
    setProgress(0);
    setStatus("connecting");

    const controller = new AbortController();

    async function connect() {
      try {
        const res = await fetch(`/api/jobs/${jobId}/events`, {
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          setStatus("error");
          setCurrentMessage("Verbindungsfehler");
          setTimeout(() => onErrorRef.current?.(), 3000);
          return;
        }

        setStatus("running");
        // Keep "Scan wird gestartet…" — first real pipeline event will replace it
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const chunk of lines) {
            const dataLine = chunk
              .split("\n")
              .find((l) => l.startsWith("data: "));
            if (!dataLine) continue;

            const json = dataLine.slice(6);
            try {
              const event: JobEvent = JSON.parse(json);
              if (doneRef.current) continue;

              setCurrentMessage(event.message);
              if (event.data?.progress != null) {
                setProgress(event.data.progress as number);
              }

              if (
                event.type === "status" &&
                event.data &&
                (event.data.status === "completed" ||
                  event.data.status === "error" ||
                  event.data.status === "cancelled")
              ) {
                doneRef.current = true;
                const finalStatus = event.data.status as "completed" | "error" | "cancelled";
                setStatus(finalStatus);
                if (finalStatus === "completed") {
                  setProgress(100);
                  setTimeout(() => onCompleteRef.current(), 1500);
                } else if (finalStatus === "cancelled") {
                  setCurrentMessage("Scan abgebrochen");
                  setTimeout(() => onCancelRef.current?.() ?? onErrorRef.current?.(), 2000);
                } else {
                  setTimeout(() => onErrorRef.current?.(), 3000);
                }
                return;
              }
            } catch {
              // ignore parse errors
            }
          }
        }

        if (!doneRef.current) {
          doneRef.current = true;
          setStatus("completed");
          setProgress(100);
          setTimeout(() => onCompleteRef.current(), 1500);
        }
      } catch {
        if (!controller.signal.aborted && !doneRef.current) {
          setStatus("error");
          setCurrentMessage("Verbindung unterbrochen");
          setTimeout(() => onErrorRef.current?.(), 3000);
        }
      }
    }

    connect();

    return () => {
      controller.abort();
    };
  }, [jobId]);

  const barColor =
    status === "error"
      ? "bg-red-500"
      : status === "completed"
        ? "bg-green-500"
        : status === "cancelled"
          ? "bg-yellow-500"
          : "bg-blue-500";

  const isRunning = status === "connecting" || status === "running";

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {isRunning && (
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          )}
          {status === "completed" && (
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
          )}
          {status === "error" && (
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
          )}
          {status === "cancelled" && (
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" />
          )}
          <span className="text-foreground">{currentMessage}</span>
        </div>
        <div className="flex items-center gap-3">
          {isRunning && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              {cancelling ? "Wird abgebrochen…" : "Abbrechen"}
            </button>
          )}
          <span className="text-muted-foreground tabular-nums">{Math.round(progress)}%</span>
        </div>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
