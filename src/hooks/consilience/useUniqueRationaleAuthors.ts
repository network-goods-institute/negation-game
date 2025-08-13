import { useMemo } from "react";

export interface RawAuthor {
  userId: string;
  username: string;
  rationales: Array<{ id: string; title: string; hasEndorsements?: boolean }>;
}

export function useUniqueRationaleAuthors(authors?: RawAuthor[]) {
  return useMemo(() => {
    if (!authors || authors.length === 0) return [] as RawAuthor[];
    const byUser = new Map<string, RawAuthor>();
    for (const a of authors) {
      const existing = byUser.get(a.userId);
      const rationales = a.rationales.map((r) => ({
        id: r.id,
        title: r.title,
        hasEndorsements: r.hasEndorsements ?? true,
      }));
      if (existing) {
        const merged = [...existing.rationales, ...rationales];
        const dedup = Array.from(
          new Map(merged.map((x) => [x.id, x])).values()
        );
        existing.rationales = dedup;
        byUser.set(a.userId, existing);
      } else {
        byUser.set(a.userId, {
          userId: a.userId,
          username: a.username,
          rationales,
        });
      }
    }
    return Array.from(byUser.values()).sort((a, b) =>
      a.username.localeCompare(b.username)
    );
  }, [authors]);
}
