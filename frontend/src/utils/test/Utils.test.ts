import { Utils } from "../Utils";

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

describe("getRatingChangeColor", () => {
  test("returns strong red at or below -10", () => {
    expect(Utils.getRatingChangeColor(-10)).toBe("#D32F2F");
    expect(Utils.getRatingChangeColor(-20)).toBe("#D32F2F");
  });

  test("returns medium red between -10 (exclusive) and -2 (inclusive)", () => {
    expect(Utils.getRatingChangeColor(-9)).toBe("#E57373");
    expect(Utils.getRatingChangeColor(-2)).toBe("#E57373");
  });

  test("returns light red between -2 (exclusive) and 0 (exclusive)", () => {
    expect(Utils.getRatingChangeColor(-1)).toBe("#FF8A80");
  });

  test("returns light green between 0 (inclusive) and 2 (inclusive)", () => {
    expect(Utils.getRatingChangeColor(0)).toBe("#A8E6A3");
    expect(Utils.getRatingChangeColor(2)).toBe("#A8E6A3");
  });

  test("returns medium green between 2 (exclusive) and 10 (inclusive)", () => {
    expect(Utils.getRatingChangeColor(3)).toBe("#4CAF50");
    expect(Utils.getRatingChangeColor(10)).toBe("#4CAF50");
  });

  test("returns strong green above 10", () => {
    expect(Utils.getRatingChangeColor(11)).toBe("#087F23");
    expect(Utils.getRatingChangeColor(100)).toBe("#087F23");
  });
});

describe("getPercentChangeColor", () => {
  test("returns strong green above 55", () => {
    expect(Utils.getPercentChangeColor(55.01)).toBe("#087F23");
    expect(Utils.getPercentChangeColor(80)).toBe("#087F23");
  });

  test("returns light green between 51 (exclusive) and 55 (inclusive)", () => {
    expect(Utils.getPercentChangeColor(55)).toBe("#A8E6A3");
    expect(Utils.getPercentChangeColor(51.01)).toBe("#A8E6A3");
  });

  test("returns blue between 49 and 51 (inclusive)", () => {
    expect(Utils.getPercentChangeColor(51)).toBe("#A0BFF0");
    expect(Utils.getPercentChangeColor(49)).toBe("#A0BFF0");
  });

  test("returns light red between 45 (exclusive) and 49 (exclusive)", () => {
    expect(Utils.getPercentChangeColor(48.99)).toBe("#FF8A80");
    expect(Utils.getPercentChangeColor(45.01)).toBe("#FF8A80");
  });

  test("returns strong red at or below 45", () => {
    expect(Utils.getPercentChangeColor(45)).toBe("#D32F2F");
    expect(Utils.getPercentChangeColor(0)).toBe("#D32F2F");
  });
});
