export const isSyncHost = (host: string | undefined | null): boolean => {
  if (!host) return false;
  const h = host.toLowerCase();
  const withoutPort = h.split(":")[0];
  return (
    withoutPort === "sync.negationgame.com" || withoutPort.startsWith("sync.")
  );
};

export const buildRationaleDetailPath = (
  id: string,
  host?: string | null,
  slug?: string | null
): string => {
  // Use a single combined path segment in the form `${slug}_${id}` when slug is present,
  // otherwise fall back to just `id`.
  const idPart = encodeURIComponent(id);
  const combined =
    slug && slug.trim() ? `${encodeURIComponent(slug)}` + "_" + idPart : idPart;
  return isSyncHost(host)
    ? `/board/${combined}`
    : `/experiment/rationale/multiplayer/${combined}`;
};

export const buildRationaleIndexPath = (host?: string | null): string => {
  return isSyncHost(host) ? "/" : "/experiment/rationale/multiplayer";
};
