import * as Y from "yjs";

interface SanitizableData extends Record<string, unknown> {
  editedBy?: unknown;
}

export const syncYMapFromArray = <T extends { id: string }>(
  ymap: Y.Map<T>,
  arr: T[]
) => {
  type Candidate = T & { selected?: unknown; dragging?: unknown; data?: SanitizableData };
  const sanitize = (item: T): T => {
    if (!item || typeof item !== "object") {
      return item;
    }
    const { selected: _selected, dragging: _dragging, ...rest } = item as Candidate;
    const data = rest.data && typeof rest.data === "object" ? (rest.data as SanitizableData) : undefined;
    if (data && "editedBy" in data) {
      const { editedBy: _editedBy, ...dataRest } = data;
      return {
        ...(rest as T),
        data: dataRest as Candidate["data"],
      } as T;
    }
    return rest as T;
  };
  const nextIds = new Set(arr.map((i) => i.id));
  for (const key of Array.from(ymap.keys())) {
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    if (!nextIds.has(key)) ymap.delete(key);
  }
  for (const item of arr) {
    const existing = ymap.get(item.id);
    const sanitizedItem = sanitize(item);
    const sanitizedExisting = existing ? sanitize(existing) : undefined;
    const same =
      sanitizedExisting &&
      JSON.stringify(sanitizedExisting) === JSON.stringify(sanitizedItem);
    if (!same) ymap.set(item.id, sanitizedItem);
  }
};
