"use client";

import { getAccessToken } from "@privy-io/react-auth";
import { setPrivyCookie } from "@/actions/users/auth";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const DEFAULT_MAX_ATTEMPTS = 8;
const DEFAULT_INITIAL_DELAY_MS = 250;
const FAILURE_COOLDOWN_MS = 2_000;

interface SetPrivyTokenOptions {
  maxAttempts?: number;
  retryDelayMs?: number;
  force?: boolean;
}

let inFlight: Promise<boolean> | null = null;
let lastFailureAt = 0;

async function attemptSetPrivyToken(maxAttempts: number, retryDelayMs: number) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const token = await getAccessToken();
      if (token) {
        await setPrivyCookie(token);
        return true;
      }
    } catch (error) {
      if (attempt === maxAttempts) {
        console.error("Error setting Privy token:", error);
      }
    }

    if (attempt < maxAttempts) {
      await sleep(retryDelayMs * attempt);
    }
  }

  console.warn("Privy access token was unavailable after", maxAttempts, "attempts");
  return false;
}

/**
 * Sets the Privy token as a cookie after retrieving it from the SDK
 * This ensures server-side actions can access the token
 */
export function setPrivyToken(options: SetPrivyTokenOptions = {}): Promise<boolean> {
  const now = Date.now();

  if (inFlight) {
    return inFlight;
  }

  if (!options.force && now - lastFailureAt < FAILURE_COOLDOWN_MS) {
    return Promise.resolve(false);
  }

  const maxAttempts = Math.max(1, options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_INITIAL_DELAY_MS;

  inFlight = attemptSetPrivyToken(maxAttempts, retryDelayMs)
    .then(success => {
      if (!success) {
        lastFailureAt = Date.now();
      }
      return success;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export function __resetSetPrivyTokenStateForTests() {
  if (process.env.NODE_ENV === "production") {
    return;
  }
  inFlight = null;
  lastFailureAt = 0;
}
