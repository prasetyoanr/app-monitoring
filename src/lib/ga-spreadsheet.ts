export const GA_SPREADSHEET_TITLE_MAX = 160;
export const GA_SPREADSHEET_DESCRIPTION_MAX = 500;
export const GA_SPREADSHEET_URL_MAX = 2048;

import { isGaDivisionSlug } from "./request-destination";

// Every role except requester can hold a spreadsheet report (the administrator has no GA
// workspace of their own; they only manage the permission). The account must belong to the
// non-IT GA scope: a service agent of any GA unit, or the other GA-division roles.
const SPREADSHEET_ROLES: ReadonlySet<string> = new Set(["service_agent", "receptionist", "approver", "final_approver"]);

export function isGaSpreadsheetEligible(member: {
  role: string;
  isActive: boolean;
  isGaUnit: boolean;
  divisionSlug: string | null | undefined;
  isIt: boolean;
}): boolean {
  if (!member.isActive || member.isIt || !SPREADSHEET_ROLES.has(member.role)) return false;
  return member.role === "service_agent" ? member.isGaUnit : isGaDivisionSlug(member.divisionSlug);
}

export function canViewGaSpreadsheet(input: {
  role: string;
  isEligible: boolean;
  isOwner: boolean;
  hasGrant: boolean;
}) {
  return input.role === "administrator" ||
    (input.isEligible && (input.isOwner || input.hasGrant));
}

export interface GaSpreadsheetInput {
  title: string;
  url: string;
  description: string;
}

export function normalizeGoogleSpreadsheetUrl(value: string) {
  const raw = value.trim();
  if (!raw || raw.length > GA_SPREADSHEET_URL_MAX) {
    throw new Error(`Spreadsheet link is required and must not exceed ${GA_SPREADSHEET_URL_MAX} characters.`);
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Enter a valid Google Sheets link.");
  }

  if (
    url.protocol !== "https:" ||
    url.hostname.toLowerCase() !== "docs.google.com" ||
    !url.pathname.startsWith("/spreadsheets/") ||
    url.username ||
    url.password
  ) {
    throw new Error("Only HTTPS links from docs.google.com/spreadsheets are allowed.");
  }

  return url.toString();
}

export function validateGaSpreadsheetInput(input: GaSpreadsheetInput) {
  const title = input.title.trim();
  const description = input.description.trim();
  if (title.length < 3 || title.length > GA_SPREADSHEET_TITLE_MAX) {
    throw new Error(`Report name must contain 3-${GA_SPREADSHEET_TITLE_MAX} characters.`);
  }
  if (description.length > GA_SPREADSHEET_DESCRIPTION_MAX) {
    throw new Error(`Description must not exceed ${GA_SPREADSHEET_DESCRIPTION_MAX} characters.`);
  }
  return {
    title,
    description,
    url: normalizeGoogleSpreadsheetUrl(input.url),
  };
}
