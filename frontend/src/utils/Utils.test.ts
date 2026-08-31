import { describe, expect, test } from "vitest";
import { Utils } from "./Utils";

describe("formatCountdown", () => {
  test("formats seconds as H:MM:SS", () => {
    expect(Utils.formatCountdown(3661)).toBe("1:01:01");
  });

  test("pads minutes and seconds under 10", () => {
    expect(Utils.formatCountdown(65)).toBe("0:01:05");
  });

  test("formats zero as 0:00:00", () => {
    expect(Utils.formatCountdown(0)).toBe("0:00:00");
  });
});

describe("formatRankThresholdRating", () => {
  test("shows the RP required to promote to Vanquisher", () => {
    expect(
      Utils.formatRankThresholdRating({
        name: "Vanquisher",
        rating: 10000000,
      }),
    ).toBe("45,000 RP");
  });

  test("shows DR for Vanquisher subdivisions", () => {
    expect(
      Utils.formatRankThresholdRating({
        name: "Vanquisher I Ignis",
        rating: 10001600,
      }),
    ).toBe("1,600 DR");
  });

  test("shows RP for ranks below Vanquisher", () => {
    expect(
      Utils.formatRankThresholdRating({ name: "Diamond 3", rating: 40800 }),
    ).toBe("40,800 RP");
  });
});
