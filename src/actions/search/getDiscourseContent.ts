import { parse } from "node-html-parser";

const discourseCache = new Map<
  string,
  { content: string | null; timestamp: number }
>();
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000; // 1 second

/**
 * Given a Discourse topic URL (with optional post number), returns
 * combined plain-text content of all posts (or the specific post).
 */
export async function getDiscourseContent(url: string): Promise<string | null> {
  const cachedEntry = discourseCache.get(url);
  if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_DURATION_MS) {
    return cachedEntry.content;
  }

  let retries = 0;
  while (retries <= MAX_RETRIES) {
    try {
      const cleanUrl = url.trim().replace(/\/$/, "");
      const endpoint = `${cleanUrl}.json?print=true`;
      const response = await fetch(endpoint);

      if (!response.ok) {
        const errorBody = await response.text();

        if (
          response.status === 429 ||
          errorBody.includes("You've performed this action too many times")
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

      const data: any = await response.json();
      const posts = data.post_stream?.posts;
      if (!Array.isArray(posts)) {
        discourseCache.set(url, { content: null, timestamp: Date.now() });
        return null;
      }

      const match = url.match(/\/t\/[^/]+\/(\d+)(?:\/(\d+))?$/);
      const postNumber = match?.[2] ? parseInt(match[2], 10) : undefined;
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
