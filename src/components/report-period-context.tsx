"use client";

import { createContext, useContext } from "react";

// The Report Period chosen at the top of the IT reports page. Sections rendered inside
// it (the administrator's all-data exports) reuse it instead of asking again, and can
// put their download button into the Report Period card through `actionsSlot`.
export type SharedReportPeriod =
  | { mode: "month"; month: string }
  | { mode: "range"; startDate: string; endDate: string };

interface ReportPeriodContextValue {
  period: SharedReportPeriod;
  actionsSlot: HTMLElement | null;
}

const ReportPeriodContext = createContext<ReportPeriodContextValue | null>(null);

export const ReportPeriodProvider = ReportPeriodContext.Provider;

export function useSharedReportPeriod() {
  return useContext(ReportPeriodContext)?.period ?? null;
}

export function useReportActionsSlot() {
  return useContext(ReportPeriodContext)?.actionsSlot ?? null;
}
