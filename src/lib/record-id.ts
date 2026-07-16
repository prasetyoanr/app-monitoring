import "server-only";

import { randomInt } from "node:crypto";

const jakartaDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
});

export function generateRecordId(prefix: "TR" | "BKU") {
  const parts = jakartaDate.formatToParts(new Date());
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const randomSuffix = String(randomInt(0, 100)).padStart(2, "0");
  return `${prefix}-${value.year}${value.month}-${value.day}${randomSuffix}`;
}
