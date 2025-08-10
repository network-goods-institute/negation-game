import { parse } from "node-html-parser";

const discourseCache = new Map<
  string,
  { content: string | null; timestamp: number }
>();
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000; // 1 second

const ALLOWED_DISCOURSE_HOSTS = [
  "forum.ethereum.org",
  "gov.gitcoin.co",
  "commonwealth.im",
  "discourse.sourcecred.io",
  "forum.scroll.io",
];

function validateDiscourseUrlDetailed(url: string): {
  ok: boolean;
  reason?: string;
  hostname?: string;
  pathname?: string;
} {
  try {
    const parsedUrl = new URL(url);

    // Only allow HTTPS
    if (parsedUrl.protocol !== "https:") {
      return {
        ok: false,
        reason: "non_https_protocol",
        hostname: parsedUrl.hostname,
        pathname: parsedUrl.pathname,
      };
    }

    // Block private IP ranges and localhost
    const hostname = parsedUrl.hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.startsWith("127.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
      hostname.match(/^169\.254\./) || // Link-local
      hostname.match(/^224\./) || // Multicast
      hostname.match(/^f[cd][0-9a-f]{2}:/i) // IPv6 private
    ) {
      return {
        ok: false,
        reason: "private_or_local_host",
        hostname: parsedUrl.hostname,
        pathname: parsedUrl.pathname,
      };
    }

    // Only allow specific trusted hosts (exact match)
    if (!ALLOWED_DISCOURSE_HOSTS.includes(hostname)) {
      return {
        ok: false,
        reason: "host_not_allowed",
        hostname: parsedUrl.hostname,
        pathname: parsedUrl.pathname,
      };
    }

    // Validate path pattern for Discourse topics
    const slugOnlyPattern = /^\/t\/[^/]+$/;
    const idPattern = /^\/t\/[^/]+\/\d+(?:\/\d+)?$/;
    if (
      !slugOnlyPattern.test(parsedUrl.pathname) &&
      !idPattern.test(parsedUrl.pathname)
    ) {
      return {
        ok: false,
        reason: "invalid_path_pattern",
        hostname: parsedUrl.hostname,
        pathname: parsedUrl.pathname,
      };
    }

    // Block suspicious query parameters
    if (parsedUrl.search && parsedUrl.search.includes("redirect")) {
      return {
        ok: false,
        reason: "suspicious_query",
        hostname: parsedUrl.hostname,
        pathname: parsedUrl.pathname,
      };
    }

    return {
      ok: true,
      hostname: parsedUrl.hostname,
      pathname: parsedUrl.pathname,
    };
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
}

/**
 * Given a Discourse topic URL (with optional post number), returns
 * combined plain-text content of all posts (or the specific post).
 */
export async function getDiscourseContent(
  url: string,
  options?: { firstPostOnly?: boolean }
): Promise<string | null> {
  const initialValidation = validateDiscourseUrlDetailed(url);
  if (!initialValidation.ok) {
    return null;
  }

  const cachedEntry = discourseCache.get(url);
  if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_DURATION_MS) {
    return cachedEntry.content;
  }

  let retries = 0;
  while (retries <= MAX_RETRIES) {
    try {
      let cleanUrl = url.trim().replace(/\/$/, "");

      // If slug-only, resolve canonical with numeric id by following redirect once
      const pathIsSlugOnly = /^https?:\/\/[^/]+\/t\/[^/]+$/.test(cleanUrl);
      if (pathIsSlugOnly) {
        try {
          const resp = await fetch(cleanUrl, {
            method: "GET",
            redirect: "follow",
            headers: {
              Accept: "text/html",
              "User-Agent": "NegationGameBot/1.0",
            },
            signal: AbortSignal.timeout(10000),
          });
          const finalUrl = resp.url?.replace(/\/$/, "");
          const finalValidation = validateDiscourseUrlDetailed(finalUrl);
          if (
            finalValidation.ok &&
            /\/t\/[^/]+\/\d+(?:\/\d+)?$/.test(finalValidation.pathname || "")
          ) {
            cleanUrl = finalUrl;
          }
        } catch (e) {}
      }

      const endpoint = `${cleanUrl}.json?print=true`;

      // Additional URL validation after construction
      const constructedValidation = validateDiscourseUrlDetailed(
        endpoint.replace(".json?print=true", "")
      );
      if (!constructedValidation.ok) {
        throw new Error("invalid_constructed_url");
      }

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "User-Agent": "NegationGameBot/1.0",
          Accept: "application/json",
        },
        redirect: "error", // Prevent redirects that could bypass validation
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        const errorBody = await response.text();
        const normalizedBody = errorBody.toLowerCase().replace(/[’‘`]/g, "'");

        if (
          response.status === 429 ||
          response.status === 422 ||
          normalizedBody.includes(
            "you've performed this action too many times"
          ) ||
          normalizedBody.includes("try again later") ||
          normalizedBody.includes("rate limit")
        ) {
          if (retries < MAX_RETRIES) {
            const backoffTime = INITIAL_BACKOFF_MS * Math.pow(2, retries);
            const jitter = Math.random() * INITIAL_BACKOFF_MS * 0.5;
            const waitTime = backoffTime + jitter;
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            retries++;
            continue;
          }
          discourseCache.set(url, { content: null, timestamp: Date.now() });
          return null;
        }
        discourseCache.set(url, { content: null, timestamp: Date.now() });
        return null;
      }

      // Check content length
      const contentLength = response.headers.get("content-length");
      if (contentLength && parseInt(contentLength) > 5000000) {
        // 5MB limit
        discourseCache.set(url, { content: null, timestamp: Date.now() });
        return null;
      }

      const data: any = await response.json();
      const posts = data.post_stream?.posts;
      if (!Array.isArray(posts)) {
        discourseCache.set(url, { content: null, timestamp: Date.now() });
        return null;
      }

      const match = url.match(/\/t\/[^/]+\/(\d+)(?:\/(\d+))?$/);
      const postNumber = options?.firstPostOnly
        ? 1
        : match?.[2]
          ? parseInt(match[2], 10)
          : undefined;
      const selected = postNumber
        ? posts.filter((p: any) => p.post_number === postNumber)
        : posts;

      if (selected.length === 0) {
        discourseCache.set(url, { content: null, timestamp: Date.now() });
        return null;
      }

      const texts = selected.map((p: any) => {
        const username = p.username || p.name || "Unknown User";
        const cookedHtml = p.cooked || "";
        const root = parse(cookedHtml);
        const textContent = root.textContent.trim();
        return `Username: ${username}\nContent:\n${textContent}`;
      });

      const fetchedContent = texts.join("\n\n").substring(0, 50000);
      discourseCache.set(url, {
        content: fetchedContent,
        timestamp: Date.now(),
      });
      return fetchedContent;
    } catch (error) {
      if (retries < MAX_RETRIES) {
        const backoffTime = INITIAL_BACKOFF_MS * Math.pow(2, retries);
        const jitter = Math.random() * INITIAL_BACKOFF_MS * 0.5;
        const waitTime = backoffTime + jitter;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        retries++;
        continue;
      }
      discourseCache.set(url, { content: null, timestamp: Date.now() });
      return null;
    }
  }
  return null;
}
