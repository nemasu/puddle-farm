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
