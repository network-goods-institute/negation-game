"use client";

import { toast } from "sonner";

/**
 * Handles authentication errors by showing a toast message to the user
 * This is used as a fallback when the user appears to be logged in but
 * authentication still fails for some reason
 *
 * @param error The error object or message
 * @param actionDescription Optional description of the action that was being attempted
 * @returns void
 */
export const handleAuthError = (
  error: unknown,
  actionDescription?: string
): void => {
  console.error("Authentication error:", error);

  const action = actionDescription ? ` when ${actionDescription}` : "";

  toast.error("Authentication Issue", {
    description: `There was an authentication problem${action}. Please try again or reload the page if the issue persists.`,
    duration: 5000,
    action: {
      label: "Reload",
      onClick: () => window.location.reload(),
    },
  });
};

/**
 * Check if an error is authentication related
 *
 * @param error The error to check
 * @returns boolean indicating if this is an auth error
 */
export const isAuthError = (error: unknown): boolean => {
  if (!error) return false;

  // Check for known auth error messages
  const errorMessage = error instanceof Error ? error.message : String(error);
  const AUTH_ERROR_MESSAGES = [
    "Must be authenticated",
    "Authentication required",
    "not authenticated",
    "error when verifying user privy token",
    "invalid auth token",
  ];

  return AUTH_ERROR_MESSAGES.some((msg) =>
    errorMessage.toLowerCase().includes(msg.toLowerCase())
  );
};
