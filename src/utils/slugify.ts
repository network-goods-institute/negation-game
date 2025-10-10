export function slugify(raw: string): string {
  return (raw || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isReservedSlug(slug: string): boolean {
  const reserved = new Set([
    "new",
    "edit",
    "settings",
    "api",
    "admin",
    "login",
    "signup",
  ]);
  return reserved.has(slug);
}

export async function generateUniqueSlug(
  baseTitle: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  const base = slugify(baseTitle) || "board";
  let candidate = base;
  let suffix = 1;
  // Avoid reserved slugs
  if (isReservedSlug(candidate)) candidate = `${base}-1`;
  while (await exists(candidate)) {
    candidate = `${base}-${suffix++}`;
  }
  return candidate;
}
