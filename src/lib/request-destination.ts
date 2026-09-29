export const GA_DIVISION_SLUG = "ga";

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
  if (!destination || destination.slug !== GA_DIVISION_SLUG) {
    return "New requests can only be submitted to GA.";
  }
  if (!destination.isServiceTarget) return "GA is not currently accepting new requests. Please contact an administrator.";
  return null;
}
