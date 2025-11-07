export const isProductionHostname = (
  hostname: string | null | undefined
): boolean => {
  if (!hostname) return false;
  const h = hostname.toLowerCase().trim();
  if (h === "negation-game-git-mindchange-network-goods-institute.vercel.app")
    return false;
  if (h === "negationgame.com") return true;
  if (h.endsWith(".negationgame.com")) return true;
  return false;
};

export const isNonProdHostname = (
  hostname: string | null | undefined
): boolean => {
  return !isProductionHostname(hostname || "");
};

export const isProductionEnvironment = (): boolean => {
  if (process.env.VERCEL_ENV) {
    return String(process.env.VERCEL_ENV).toLowerCase() === "production";
  }
  return String(process.env.NODE_ENV || "").toLowerCase() === "production";
};

export const isProductionRequest = (
  hostname: string | null | undefined
): boolean => {
  if (!hostname) return isProductionEnvironment();
  const h = hostname.toLowerCase().trim();
  // Short-circuit specific Vercel deployment to non-prod
  if (
    h === "negation-game-git-mindchange-network-goods-institute.vercel.app" ||
    h ===
      "negation-game-git-carroll-mechan-def371-network-goods-institute.vercel.app" ||
    // Treat market.negationgame.com as non-production (allow anon)
    h === "market.negationgame.com"
  )
    return false;
  // Treat as production if either the environment is production or the hostname is a production domain
  return isProductionEnvironment() || isProductionHostname(hostname);
};
