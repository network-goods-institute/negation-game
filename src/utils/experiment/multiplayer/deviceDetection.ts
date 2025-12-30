export type NonDesktopSignal = {
  innerWidth?: number;
};

const NON_DESKTOP_WIDTH = 420;

export const isNonDesktopExperience = (signal: NonDesktopSignal = {}) => {
  const innerWidth =
    signal.innerWidth ??
    (typeof window !== "undefined" ? window.innerWidth : 0);

  return innerWidth > 0 && innerWidth < NON_DESKTOP_WIDTH;
};
