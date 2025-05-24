import { fetchPoint } from "@/actions/points/fetchPoint";
import { fetchViewpoint } from "@/actions/viewpoints/fetchViewpoint";
import { encodeId } from "@/lib/negation-game/encodeId";
import type { DiscourseMessage } from "@/types/chat";

function getPointUrl(
  pointId: number,
  space: string | null,
  baseUrl: string
): string {
  try {
    const encodedId = encodeId(pointId);
    const path = space ? `/s/${space}/${encodedId}` : `/p/${encodedId}`;
    return `${baseUrl}${path}`;
  } catch (e) {
    const path = space ? `/s/${space}/${pointId}` : `/p/${pointId}`;
    return `${baseUrl}${path}`;
  }
}

function getRationaleUrl(
  rationaleId: string,
  space: string | null,
  baseUrl: string
): string {
  const path = space
    ? `/s/${space}/rationale/${rationaleId}`
    : `/rationale/${rationaleId}`;
  return `${baseUrl}${path}`;
}

const encodedIdCache = new Map<number, string>();
function getCachedEncodedId(id: number): string {
  let encoded = encodedIdCache.get(id);
  if (!encoded) {
    encoded = encodeId(id);
    encodedIdCache.set(id, encoded);
  }
  return encoded;
}

const pointDataCache = new Map<number, Promise<any>>();
function getCachedPointData(pointId: number): Promise<any> {
  let pointData = pointDataCache.get(pointId);
  if (!pointData) {
    pointData = fetchPoint(pointId);
    pointDataCache.set(pointId, pointData);
  }
  return pointData;
}

const rationaleDataCache = new Map<string, Promise<any>>();
function getCachedRationaleData(rationaleId: string): Promise<any> {
  let rationaleData = rationaleDataCache.get(rationaleId);
  if (!rationaleData) {
    rationaleData = fetchViewpoint(rationaleId);
    rationaleDataCache.set(rationaleId, rationaleData);
  }
  return rationaleData;
}

function extractPointIds(text: string): number[] {
  const pointMatches = text.matchAll(/\[Point:(\d+)/g);
  return [...new Set([...pointMatches].map((m) => parseInt(m[1], 10)))];
}

function extractRationaleIds(text: string): string[] {
  const rationaleMatches = text.matchAll(/\[Rationale:([\w-]+)/g);
  return [...new Set([...rationaleMatches].map((m) => m[1]))];
}

const pointRefRegex = /\[Point:(\d+)(?:\s+"([^"\n]+?)")?\]/;
const multiPointRefRegex = /\[Point:\d+(?:,\s*Point:\d+)*\]/;
const rationaleRefRegex = /\[Rationale:([\w-]+)(?:\s+"([^"\n]+?)")?\]/;
const discoursePostRefRegex = /\[Discourse Post:(\d+)\]/;
const multiDiscoursePostRefRegex =
  /\[Discourse Post:\d+(?:,\s*Discourse Post:\d+)*\]/;
const sourceCiteRegex =
  /\(Source:\s*(Rationale|Endorsed Points?|Discourse Post)\s*(?:"([^"\n]+?)"\s*)?ID:([\w\s,:;-]+)\)/;
const inlineRationaleRefRegex = /Rationale\s+"([^"\n]+?)"\s+\(ID:([\w-]+)\)/;

const combinedRegex = new RegExp(
  `(${multiDiscoursePostRefRegex.source})|` +
    `(${multiPointRefRegex.source})|` +
    `(${pointRefRegex.source})|` +
    `(${rationaleRefRegex.source})|` +
    `(${discoursePostRefRegex.source})|` +
    `(${sourceCiteRegex.source})|` +
    `(${inlineRationaleRefRegex.source})`,
  "g"
);

export async function getChatMessageAsText(
  rawContent: string,
  space: string | null,
  discourseUrl: string,
  storedMessages: DiscourseMessage[]
): Promise<string> {
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://negationgame.com";

  const pointIds = extractPointIds(rawContent);
  const rationaleIds = extractRationaleIds(rawContent);

  const pointFetches = pointIds.map((id) => getCachedPointData(id));
  const rationaleFetches = rationaleIds.map((id) => getCachedRationaleData(id));

  await Promise.all([...pointFetches, ...rationaleFetches]);

  const parts: (string | Promise<string>)[] = [];
  let lastIndex = 0;
  let match;

  combinedRegex.lastIndex = 0;

  while ((match = combinedRegex.exec(rawContent)) !== null) {
    if (match.index > lastIndex) {
      parts.push(rawContent.substring(lastIndex, match.index));
    }

    const matchedString = match[0];
    let replacementPromise: Promise<string> | string = matchedString;

    if (match[1]) {
      const postIds = matchedString.match(/\d+/g) || [];
      const resolvedPosts = postIds.map((postIdStr) => {
        const postId = parseInt(postIdStr, 10);
        const postUrl = `${discourseUrl}/p/${postId}`;
        return `[Discourse Post:${postId}](${postUrl})`;
      });
      replacementPromise = resolvedPosts.join(", ");
    } else if (match[2]) {
      const pointIds = matchedString.match(/\d+/g) || [];
      replacementPromise = (async () => {
        const resolvedPoints = await Promise.all(
          pointIds.map(async (pointIdStr) => {
            const pointId = parseInt(pointIdStr, 10);
            try {
              const pointData = await getCachedPointData(pointId);
              const pointUrl = getPointUrl(pointId, space, baseUrl);
              const encodedId = getCachedEncodedId(pointId);
              const displayText = `Point:${encodedId}${pointData?.content ? ` "${pointData.content}"` : ""}`;
              return `[${displayText}](${pointUrl})`;
            } catch {
              const pointUrl = getPointUrl(pointId, space, baseUrl);
              const encodedId = getCachedEncodedId(pointId);
              return `[Point:${encodedId}](${pointUrl})`;
            }
          })
        );
        return resolvedPoints.join(", ");
      })();
    } else if (match[3]) {
      const pointId = parseInt(match[4], 10);
      replacementPromise = (async () => {
        try {
          const pointData = await getCachedPointData(pointId);
          const pointUrl = getPointUrl(pointId, space, baseUrl);
          const encodedId = getCachedEncodedId(pointId);
          const displayText = `Point:${encodedId}${pointData?.content ? ` "${pointData.content}"` : ""}`;
          return `[${displayText}](${pointUrl})`;
        } catch {
          const pointUrl = getPointUrl(pointId, space, baseUrl);
          const encodedId = getCachedEncodedId(pointId);
          return `[Point:${encodedId}](${pointUrl})`;
        }
      })();
    } else if (match[6]) {
      const rationaleId = match[7];
      replacementPromise = (async () => {
        try {
          const rationaleData = await getCachedRationaleData(rationaleId);
          const rationaleUrl = getRationaleUrl(rationaleId, space, baseUrl);
          const displayText = `Rationale:${rationaleId}${rationaleData?.title ? ` "${rationaleData.title}"` : ""}`;
          return `[${displayText}](${rationaleUrl})`;
        } catch {
          const rationaleUrl = getRationaleUrl(rationaleId, space, baseUrl);
          return `[Rationale:${rationaleId}](${rationaleUrl})`;
        }
      })();
    } else if (match[9]) {
      const postId = match[10];
      const postUrl = `${discourseUrl}/p/${postId}`;
      replacementPromise = `[Discourse Post:${postId}](${postUrl})`;
    } else if (match[11]) {
      const sourceTypeRaw = match[12] as
        | "Rationale"
        | "Endorsed Point"
        | "Endorsed Points"
        | "Discourse Post";
      const titleFromMarkdown = match[13];
      const idsRawString = match[14];

      const sourceType: "Rationale" | "Endorsed Point" | "Discourse Post" =
        sourceTypeRaw === "Endorsed Points"
          ? "Endorsed Point"
          : (sourceTypeRaw as any);

      replacementPromise = (async () => {
        const idMatches = idsRawString.match(/[\w-]+/g) || [];
        const texts: string[] = [];

        for (const idStr of idMatches) {
          if (sourceType === "Endorsed Point" && /^\d+$/.test(idStr)) {
            const pointId = parseInt(idStr, 10);
            try {
              const pointData = await getCachedPointData(pointId);
              const pointUrl = getPointUrl(pointId, space, baseUrl);
              const encodedId = getCachedEncodedId(pointId);
              const displayText = `Point:${encodedId}${pointData?.content ? ` "${pointData.content}"` : ""}`;
              texts.push(`[${displayText}](${pointUrl})`);
            } catch {
              const pointUrl = getPointUrl(pointId, space, baseUrl);
              const encodedId = getCachedEncodedId(pointId);
              texts.push(`[Point:${encodedId}](${pointUrl})`);
            }
          } else if (sourceType === "Discourse Post" && /^\d+$/.test(idStr)) {
            const postId = parseInt(idStr, 10);
            const postUrl = `${discourseUrl}/p/${postId}`;
            texts.push(`[Discourse Post:${postId}](${postUrl})`);
          } else if (sourceType === "Rationale") {
            try {
              const rationaleData = await getCachedRationaleData(idStr);
              const rationaleUrl = getRationaleUrl(idStr, space, baseUrl);
              const displayText = `Rationale:${idStr}${rationaleData?.title ? ` "${rationaleData.title}"` : ""}`;
              texts.push(`[${displayText}](${rationaleUrl})`);
            } catch {
              const rationaleUrl = getRationaleUrl(idStr, space, baseUrl);
              texts.push(`[Rationale:${idStr}](${rationaleUrl})`);
            }
          }
        }
        if (texts.length === 1) {
          return `(Source: ${texts[0]})`;
        } else {
          return `(Source: ${texts.join(", ")})`;
        }
      })();
    }
    // Group 15: inlineRationaleRefRegex (G16=Title, G17=ID)
    else if (match[15]) {
      const rationaleTitle = match[16];
      const rationaleId = match[17];
      const rationaleUrl = getRationaleUrl(rationaleId, space, baseUrl);
      const displayText = `Rationale:${rationaleId} "${rationaleTitle}"`;
      replacementPromise = `[${displayText}](${rationaleUrl})`;
    }

    parts.push(replacementPromise);
    lastIndex = match.index + matchedString.length;
  }

  if (lastIndex < rawContent.length) {
    parts.push(rawContent.substring(lastIndex));
  }

  const resolvedParts = await Promise.all(parts);
  return resolvedParts.join("");
}
