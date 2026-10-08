export const GA_DIVISION_SLUG = "ga";

// The General Affairs division is named differently from one database to another ("GA" in
// a fresh install, "General Affair" in the production data), so it is recognised by any
// of its established slugs instead of one fixed value.
export const GA_DIVISION_SLUGS: readonly string[] = [GA_DIVISION_SLUG, "general-affair", "general-affairs"];

export function isGaDivisionSlug(slug: string | null | undefined): boolean {
  return Boolean(slug && GA_DIVISION_SLUGS.includes(slug));
}

type RequestDestination = {
  id: string;
  slug: string;
  isServiceTarget: boolean;
};

// Apply only to new requests; historical destinations keep their original scope.
export function requestDestinationError(
  originDivisionId: string | null | undefined,
  destination: RequestDestination | null | undefined,
): string | null {
  if (!originDivisionId) return "Your account has no assigned division. Please contact an administrator.";
  if (destination && originDivisionId === destination.id) {
    return "Requests to your own division are not allowed.";
  }
  if (!destination || !isGaDivisionSlug(destination.slug)) {
    return "New requests can only be submitted to GA.";
  }
  if (!destination.isServiceTarget) return "GA is not currently accepting new requests. Please contact an administrator.";
  return null;
}
