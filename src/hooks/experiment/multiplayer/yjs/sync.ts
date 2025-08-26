import * as Y from "yjs";

export const syncYMapFromArray = <T extends { id: string }>(
  ymap: Y.Map<T>,
  arr: T[]
) => {
  const sanitize = (item: any) => {
    if (item && typeof item === "object" && "data" in item) {
      const d = (item as any).data || {};
      if (d && typeof d === "object" && "editedBy" in d) {
        const { editedBy, ...rest } = d as any;
        return { ...(item as any), data: rest } as T;
      }
    }
    return item as T;
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
