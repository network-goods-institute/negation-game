import { atom } from "jotai";

// State machine states
export type MarketOverlayState = "AUTO_TEXT" | "AUTO_PRICE" | "LOCK_TEXT" | "LOCK_PRICE";
export type MarketOverlaySide = "TEXT" | "PRICE";

export const defaultZoomThreshold = 0.6;

// Compute the display side from the current state
export function computeSide(state: MarketOverlayState): MarketOverlaySide {
  if (state === "AUTO_TEXT" || state === "LOCK_TEXT") return "TEXT";
  return "PRICE";
}

// Check if the state is locked
export function isLocked(state: MarketOverlayState): boolean {
  return state === "LOCK_TEXT" || state === "LOCK_PRICE";
}

// Get the lock mode (for display)
export function getLockMode(state: MarketOverlayState): "TEXT" | "PRICE" | null {
  if (state === "LOCK_TEXT") return "TEXT";
  if (state === "LOCK_PRICE") return "PRICE";
  return null;
}

// State transitions
export function handleZoomChange(currentState: MarketOverlayState, zoom: number, threshold: number = defaultZoomThreshold): MarketOverlayState {
  // Only auto states respond to zoom changes
  if (currentState === "AUTO_TEXT" && zoom <= threshold) {
    return "AUTO_PRICE";
  }
  if (currentState === "AUTO_PRICE" && zoom > threshold) {
    return "AUTO_TEXT";
  }
  return currentState;
}

export function handleClickText(currentState: MarketOverlayState): MarketOverlayState {
  return "LOCK_TEXT";
}

export function handleClickPrice(currentState: MarketOverlayState): MarketOverlayState {
  return "LOCK_PRICE";
}

export function handleClickAuto(currentState: MarketOverlayState, zoom: number, threshold: number = defaultZoomThreshold): MarketOverlayState {
  // Return to appropriate auto state based on current zoom
  return zoom > threshold ? "AUTO_TEXT" : "AUTO_PRICE";
}

// Initial state is AUTO_TEXT (assuming zoomed in by default)
export const marketOverlayStateAtom = atom<MarketOverlayState>("AUTO_TEXT");
export const marketOverlayZoomThresholdAtom = atom<number>(defaultZoomThreshold);

