import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { buildSearchPath, useSearchNavigation } from "./useSearchNavigation";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

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
  ])("encodes special characters in the search string: $label", ({
    input,
    expected,
  }) => {
    expect(buildSearchPath(input, false)).toBe(expected);
  });

  test("regression: a literal 'exact' search string is not mistaken for the exact flag", () => {
    expect(buildSearchPath("exact", false)).toBe("/search?q=exact");
  });
});

describe("useSearchNavigation", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  test("navigates to the path built from the given search string and exact flag", () => {
    const { result } = renderHook(() => useSearchNavigation());

    result.current("sol", true);

    expect(mockNavigate).toHaveBeenCalledWith("/search?q=sol&exact=true");
  });
});
