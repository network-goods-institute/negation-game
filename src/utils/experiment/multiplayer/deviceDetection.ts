export type NonDesktopSignal = {
  userAgent?: string;
  pointerCoarse?: boolean;
  hoverNone?: boolean;
  innerWidth?: number;
};

const MOBILE_UA_PATTERN =
  /Mobi|Android|iPhone|iPad|iPod|Tablet|PlayBook|Silk|Kindle/i;

export const isNonDesktopExperience = (signal: NonDesktopSignal = {}) => {
  const userAgent =
    signal.userAgent ??
    (typeof navigator !== "undefined" ? navigator.userAgent : "");
  const pointerCoarse =
    signal.pointerCoarse ??
    (typeof window !== "undefined" &&
    typeof window.matchMedia === "function"
      ? window.matchMedia("(pointer: coarse)").matches
      : false);
  const hoverNone =
    signal.hoverNone ??
    (typeof window !== "undefined" &&
    typeof window.matchMedia === "function"
      ? window.matchMedia("(hover: none)").matches
      : false);
  const innerWidth =
    signal.innerWidth ??
    (typeof window !== "undefined" ? window.innerWidth : 0);

  const narrowViewport = innerWidth > 0 && innerWidth < 900;
  const isMobileUa = MOBILE_UA_PATTERN.test(userAgent);
  return (
    isMobileUa ||
    narrowViewport ||
    (pointerCoarse && hoverNone) ||
    (pointerCoarse && innerWidth > 0 && innerWidth < 900)
  );
};
