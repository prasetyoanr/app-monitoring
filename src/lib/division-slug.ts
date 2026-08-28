const MAX_DIVISION_SLUG_LENGTH = 80;

export function divisionSlugFromName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_DIVISION_SLUG_LENGTH)
    .replace(/-+$/g, "");

  return slug || "division";
}

export function isValidDivisionSlug(slug: string): boolean {
  return (
    slug.length > 0 &&
    slug.length <= MAX_DIVISION_SLUG_LENGTH &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  );
}
