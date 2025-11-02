// Utility for handling AI model overload errors with retry logic

import { logger } from "@/lib/logger";

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  factor?: number;
  overloadErrorMessages?: string[];
}

const defaultOptions: Required<RetryOptions> = {
  maxRetries: 5,
  initialDelay: 500, // 500ms
  maxDelay: 10000, // 10 seconds
  factor: 2, // exponential factor
  overloadErrorMessages: [
    "The model is overloaded",
    "Rate limit exceeded",
    "Server error",
    "Internal server error",
    "Service Unavailable",
    "resource has been exhausted",
    "too many requests",
    "quota",
    "context length",
    "maximum context length",
    "timeout",
    "timed out",
    "ETIMEDOUT",
    "ECONNRESET",
    "gateway timeout",
    "504",
  ],
};

/**
 * Wraps an async function with exponential backoff retry logic for handling AI model overload errors
 * @param fn The async function to retry
 * @param options Retry configuration options
 * @returns A wrapped function that will retry on specific errors
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: unknown = null;

  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if this is an overload error we should retry
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isOverloadError = opts.overloadErrorMessages.some((msg) =>
        errorMessage.includes(msg)
      );

      // If it's not an overload error or we've reached max retries, throw the error
      if (!isOverloadError || attempt >= opts.maxRetries - 1) {
        throw error;
      }

      // Calculate delay with exponential backoff and some randomness (jitter)
      const delay = Math.min(
        opts.initialDelay *
          Math.pow(opts.factor, attempt) *
          (1 + Math.random() * 0.1),
        opts.maxDelay
      );

      logger.log(
        `AI model overloaded, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${opts.maxRetries})`
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached due to the throw in the loop, but TypeScript needs it
  throw lastError;
}
