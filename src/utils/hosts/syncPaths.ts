export const isSyncHost = (host: string | undefined | null): boolean => {
  if (!host) return false;
  const h = host.toLowerCase();
  const withoutPort = h.split(":")[0];
  return withoutPort === "sync.negationgame.com" || withoutPort.startsWith("sync.");
};

export const buildRationaleDetailPath = (
  id: string,
  host?: string | null
): string => {
  return isSyncHost(host) ? `/board/${encodeURIComponent(id)}` : `/experiment/rationale/multiplayer/${encodeURIComponent(id)}`;
};

export const buildRationaleIndexPath = (
  host?: string | null
): string => {
  return isSyncHost(host) ? "/" : "/experiment/rationale/multiplayer";
};

