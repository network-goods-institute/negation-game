import { toast } from "sonner";

let lastReadOnlyToastAt = 0;

export function showReadOnlyToast(options?: { cooldownMs?: number; message?: string }) {
  const cooldownMs = options?.cooldownMs ?? 2000;
  const message = options?.message ?? "Read-only mode: Log in to make changes";
  const now = Date.now();
  if (now - lastReadOnlyToastAt < cooldownMs) return;
  lastReadOnlyToastAt = now;
  try {
    toast.warning(message);
  } catch {}
}


