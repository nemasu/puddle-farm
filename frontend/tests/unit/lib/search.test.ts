import { buildSearchPath } from "../../../src/lib/search";

interface EncodingCase {
  label: string;
  input: string;
  expected: string;
}

describe("buildSearchPath", () => {
  test("builds a query-param path for a normal search string", () => {
    expect(buildSearchPath("sol", false)).toBe("/search?q=sol");
  });

  test("includes exact=true when exact is requested", () => {
    expect(buildSearchPath("sol", true)).toBe("/search?q=sol&exact=true");
  });

  test("does not collide with an empty search string and exact requested", () => {
    expect(buildSearchPath("", true)).toBe("/search?q=&exact=true");
  });

  test.each<EncodingCase>([
    {
      label: "spaces and slashes",
      input: "a b/c",
      expected: "/search?q=a+b%2Fc",
    },
    {
      label: "multibyte characters",
      input: "ソル",
      expected: "/search?q=%E3%82%BD%E3%83%AB",
    },
  ])(
    "encodes special characters in the search string: $label",
    ({ input, expected }) => {
      expect(buildSearchPath(input, false)).toBe(expected);
    },
  );

  test("regression: a literal 'exact' search string is not mistaken for the exact flag", () => {
    expect(buildSearchPath("exact", false)).toBe("/search?q=exact");
  });
});
