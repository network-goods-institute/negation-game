import { renderHook } from "@testing-library/react";
import { useUniqueRationaleAuthors } from "./useUniqueRationaleAuthors";

describe("useUniqueRationaleAuthors", () => {
  it("dedupes authors and rationales, defaults hasEndorsements to true", () => {
    const authors = [
      {
        userId: "u1",
        username: "alice",
        rationales: [
          { id: "r1", title: "A1" },
          { id: "r2", title: "A2", hasEndorsements: false },
        ],
      },
      {
        userId: "u1",
        username: "alice",
        rationales: [{ id: "r1", title: "A1" }],
      },
      {
        userId: "u2",
        username: "bob",
        rationales: [{ id: "r9", title: "B1" }],
      },
    ];

    const { result } = renderHook(() => useUniqueRationaleAuthors(authors));
    expect(result.current).toHaveLength(2);
    const alice = result.current.find((a) => a.userId === "u1")!;
    expect(alice.rationales.map((r) => r.id)).toEqual(["r1", "r2"]);
    expect(alice.rationales.find((r) => r.id === "r1")!.hasEndorsements).toBe(
      true
    );
    expect(alice.rationales.find((r) => r.id === "r2")!.hasEndorsements).toBe(
      false
    );
  });
});
