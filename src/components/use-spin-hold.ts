"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// A refresh can finish in a few milliseconds, which would make the icon flicker instead of
// turn. `hold()` keeps the spin going for at least `minimumMs`; combine it with the real
// loading state: `spinning = isRefreshing || holding`.
export function useSpinHold(minimumMs = 850) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const hold = useCallback(() => {
    window.clearTimeout(timer.current);
    setHolding(true);
    timer.current = window.setTimeout(() => setHolding(false), minimumMs);
  }, [minimumMs]);

  return [holding, hold] as const;
}
