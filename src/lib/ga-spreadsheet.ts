export const GA_SPREADSHEET_TITLE_MAX = 160;
export const GA_SPREADSHEET_DESCRIPTION_MAX = 500;
export const GA_SPREADSHEET_URL_MAX = 2048;

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
