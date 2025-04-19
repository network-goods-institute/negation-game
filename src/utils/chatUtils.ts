import { ChatMessage } from "@/types/chat";

const pointRefRegex = /\[Point:(\d+)(?:\s+"[^"\\n]+?")?\]/g;
const multiPointRefRegex = /\[Point:\d+(?:,\s*Point:\d+)*\]/g;
const rationaleRefRegex = /\[Rationale:([\w-]+)(?:\s+"[^"\\n]+?")?\]/g;
const discoursePostRefRegex = /\[Discourse Post:(\d+)\]/g;
const multiDiscoursePostRefRegex =
  /\[Discourse Post:\d+(?:,\s*Discourse Post:\d+)*\]/g;
const sourceCiteRegex =
  /\(Source:\s*(Rationale|Endorsed Point|Discourse Post)\s*(?:\"[^"\\n]+?\"\s*)?ID:([\w\s,-]+)\)/g;
const inlineRationaleRefRegex = /Rationale\s+"[^"\\n]+?\"\s+\(ID:([\w-]+)\)/g;

export const extractSourcesFromMarkdown = (
  content: string
): ChatMessage["sources"] => {
  const sources: ChatMessage["sources"] = [];
  const foundIds = new Set<string>();

  const addSource = (type: string, id: string | number) => {
    const key = `${type}-${id}`;
    if (!foundIds.has(key)) {
      sources.push({ type, id });
      foundIds.add(key);
    }
  };

  let match;
  const digitRegex = /\d+/g;

  // Reset regex indices before each loop
  multiDiscoursePostRefRegex.lastIndex = 0;
  while ((match = multiDiscoursePostRefRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    let digitMatch;
    digitRegex.lastIndex = 0; // Reset for this inner loop
    while ((digitMatch = digitRegex.exec(fullMatch)) !== null) {
      const id = parseInt(digitMatch[0], 10);
      if (!isNaN(id)) {
        addSource("Discourse Post", id);
      }
    }
  }

  multiPointRefRegex.lastIndex = 0;
  while ((match = multiPointRefRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    let digitMatch;
    digitRegex.lastIndex = 0; // Reset for inner loop
    while ((digitMatch = digitRegex.exec(fullMatch)) !== null) {
      const id = parseInt(digitMatch[0], 10);
      if (!isNaN(id)) {
        addSource("Endorsed Point", id);
      }
    }
  }

  pointRefRegex.lastIndex = 0;
  while ((match = pointRefRegex.exec(content)) !== null) {
    // Avoid double-counting from multi-point refs
    if (match[0].includes(", Point:")) continue;
    const id = parseInt(match[1], 10);
    if (!isNaN(id)) {
      addSource("Endorsed Point", id);
    }
  }

  discoursePostRefRegex.lastIndex = 0;
  while ((match = discoursePostRefRegex.exec(content)) !== null) {
    // Avoid double-counting from multi-discourse refs
    if (match[0].includes(", Discourse Post:")) continue;
    const id = parseInt(match[1], 10);
    if (!isNaN(id)) {
      addSource("Discourse Post", id);
    }
  }

  rationaleRefRegex.lastIndex = 0;
  while ((match = rationaleRefRegex.exec(content)) !== null) {
    addSource("Rationale", match[1]);
  }

  inlineRationaleRefRegex.lastIndex = 0;
  while ((match = inlineRationaleRefRegex.exec(content)) !== null) {
    addSource("Rationale", match[1]);
  }

  sourceCiteRegex.lastIndex = 0;
  while ((match = sourceCiteRegex.exec(content)) !== null) {
    const sourceType = match[1];
    const sourceIdString = match[2];
    const sourceIds = sourceIdString
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id);
    sourceIds.forEach((id) => {
      let parsedId: string | number | undefined = undefined;
      if (sourceType === "Discourse Post" || sourceType === "Endorsed Point") {
        const numId = parseInt(id, 10);
        if (!isNaN(numId)) parsedId = numId;
      } else if (sourceType === "Rationale") {
        parsedId = id; // Rationale IDs are strings
      }

      if (parsedId !== undefined) {
        addSource(sourceType, parsedId);
      }
    });
  }

  console.log("[chatUtils] Extracted sources from content:", sources);
  return sources;
};
