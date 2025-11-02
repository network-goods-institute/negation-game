export const isMindchangeEnabledServer = (): boolean => {
  return String(process.env.ENABLE_MINDCHANGE).toLowerCase() === "true";
};

export const isMindchangeEnabledClient = (): boolean => {
  return (
    String(process.env.NEXT_PUBLIC_ENABLE_MINDCHANGE).toLowerCase() === "true"
  );
};

export const isMindchangeEnabledUniversal = (): boolean => {
  try {
    // In Next.js, client bundles can read NEXT_PUBLIC_ vars; server reads server vars
    const isServer = typeof window === "undefined";
    return isServer ? isMindchangeEnabledServer() : isMindchangeEnabledClient();
  } catch {
    return false;
  }
};
