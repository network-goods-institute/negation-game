const parseBool = (v: string | undefined, fallback: boolean) => {
  if (typeof v !== "string") return fallback;
  const s = v.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(s)) return true;
  if (["0", "false", "no", "off"].includes(s)) return false;
  return fallback;
};

export const inversePairEnabled = parseBool(
  process.env.NEXT_PUBLIC_MULTIPLAYER_INVERSE_PAIR_ENABLED,
  false
);
