"use client";

import { createContext, useContext } from "react";

export interface ScanContextValue {
  scanning: boolean;
  prepareScan: () => void;
  startScan: (jobId: string) => void;
  cancelScan: () => void;
}

export const ScanContext = createContext<ScanContextValue>({
  scanning: false,
  prepareScan: () => {},
  startScan: () => {},
  cancelScan: () => {},
});

export function useScanContext() {
  return useContext(ScanContext);
}
