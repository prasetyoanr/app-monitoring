import type { TicketRecord } from "@/data/types";

export type QueueDateOrder = "oldest" | "newest";
type DatedRequest = Pick<TicketRecord, "id" | "reportedAtIso" | "reportedDate">;

const reportedAtFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatQueueReportedAt(iso: string) {
  return `${reportedAtFormatter.format(new Date(iso))} WIB`;
}

export function filterAndSortRequestQueue<T extends DatedRequest>(
  records: readonly T[],
  fromDate: string,
  toDate: string,
  order: QueueDateOrder,
): T[] {
  // reportedDate is already a Jakarta-local YYYY-MM-DD, independent of the
  // browser's timezone. Both ends are inclusive, including the entire last day.
  const filtered = records.filter((record) =>
    (!fromDate || record.reportedDate >= fromDate) &&
    (!toDate || record.reportedDate <= toDate),
  );
  // Sort a new array, never the server-provided props. ISO timestamps are
  // normalized to UTC by toTicketRecord, so lexical ordering includes time.
  return filtered.sort((a, b) => {
    const comparison = a.reportedAtIso.localeCompare(b.reportedAtIso) || a.id.localeCompare(b.id);
    return order === "oldest" ? comparison : -comparison;
  });
}
