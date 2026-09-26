import { generateJsonLdScript } from "@/lib/seo/utils";

describe("generateJsonLdScript", () => {
  it("preserves data without allowing an HTML script breakout", () => {
    const structuredData = {
      bio: "</script><script>alert('xss')</script>",
      company: "Research & Development",
      separators: "\u2028\u2029",
    };

    const serialized = generateJsonLdScript(structuredData);

    expect(serialized).not.toContain("<");
    expect(serialized).not.toContain(">");
    expect(serialized).not.toContain("&");
    expect(serialized).not.toContain("\u2028");
    expect(serialized).not.toContain("\u2029");
    expect(JSON.parse(serialized)).toEqual(structuredData);
  });

  it("rejects values that JSON cannot serialize", () => {
    expect(() => generateJsonLdScript(undefined)).toThrow(TypeError);
  });
});
