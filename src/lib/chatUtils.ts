import { ChatMessage } from "@/types/chat";

/**
 * Converts an ArrayBuffer to a hexadecimal string.
 * @param buffer The ArrayBuffer to convert.
 * @returns The hexadecimal string representation.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Computes a SHA-256 hash for the given chat state (title and messages).
 * Ensures consistent stringification before hashing.
 * @param title The chat title.
 * @param messages The array of chat messages.
 * @returns A promise that resolves to the SHA-256 hash as a hex string.
 */
export async function computeChatStateHash(
  title: string,
  messages: ChatMessage[]
): Promise<string> {
  // Create a stable string representation.
  // We stringify the whole messages array directly.
  // Assuming message order is the primary factor for state change.
  const dataToHash = JSON.stringify({ title, messages });

  // Encode the string as UTF-8
  const encoder = new TextEncoder();
  const data = encoder.encode(dataToHash);

  // Compute the SHA-256 hash
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  // Convert the hash buffer to a hex string
  const hashHex = bufferToHex(hashBuffer);

  return hashHex;
}
