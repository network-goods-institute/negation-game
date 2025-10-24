export const isSyncHost = (host: string | undefined | null): boolean => {
  if (!host) return false;
  const h = host.toLowerCase();
  const withoutPort = h.split(":")[0];
  return (
    withoutPort === "sync.negationgame.com" || withoutPort.startsWith("sync.")
  );
};

export const isRootOrSyncHost = (host: string | undefined | null): boolean => {
  if (!host) return false;
  const h = host.toLowerCase();
  const withoutPort = h.split(":")[0];
  return (
    withoutPort === "negationgame.com" ||
    withoutPort === "sync.negationgame.com" ||
    withoutPort.startsWith("sync.") ||
    withoutPort === "localhost" ||
    withoutPort === "127.0.0.1" ||
    withoutPort === "::1"
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
  return isRootOrSyncHost(host)
    ? `/board/${combined}`
    : `/experiment/rationale/multiplayer/${combined}`;
};

export const buildRationaleIndexPath = (host?: string | null): string => {
  return isRootOrSyncHost(host) ? "/" : "/experiment/rationale/multiplayer";
};
