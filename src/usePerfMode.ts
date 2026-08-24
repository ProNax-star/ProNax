/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useState } from "react";

export type PerfMode = "high" | "low";

function detect(): PerfMode {
  if (typeof window === "undefined") return "high";
  try {
    const nav: any = navigator;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    const saveData = !!conn?.saveData;
    const slowNet = conn?.effectiveType && /(^|-)(2g|slow-2g|3g)$/i.test(conn.effectiveType);
    const lowMem = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2;
    const lowCpu = typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4;
    const smallScreen = window.matchMedia("(max-width: 640px)").matches;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (saveData || slowNet || lowMem || reduceMotion || (smallScreen && lowCpu)) return "low";
    return "high";
  } catch {
    return "high";
  }
}

let cached: PerfMode | null = null;

export function getPerfMode(): PerfMode {
  if (cached) return cached;
  cached = detect();
  if (typeof document !== "undefined") {
    document.documentElement.dataset.perf = cached;
  }
  return cached;
}

export function usePerfMode(): PerfMode {
  const [mode, setMode] = useState<PerfMode>(() => getPerfMode());
  useEffect(() => {
    const m = detect();
    cached = m;
    document.documentElement.dataset.perf = m;
    setMode(m);
  }, []);
  return mode;
}
