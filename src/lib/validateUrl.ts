export function validateAndFormatUrl(url: string): string | null {
  if (!url) return null;

  try {
    // Try to construct a URL object
    let urlObj = new URL(url);

    // Check if it's a relative URL
    if (!urlObj.protocol) {
      urlObj = new URL(`https://${url}`);
    }

    // Return the absolute URL
    return urlObj.href;
  } catch {
    // If URL construction fails, try adding https://
    try {
      const urlWithProtocol = new URL(`https://${url}`);
      return urlWithProtocol.href;
    } catch {
      return null;
    }
  }
}
