import {
  DEFAULT_DISPLAY_PREFERENCES,
  formatDisplayTime,
  readPreferenceSeed,
  utcDate,
  validTimeZone,
} from "../../../src/lib/display-preferences";

describe("SSR display preferences", () => {
  test("accepts only explicit booleans and a real time zone from public cookies", () => {
    const cookies: Record<string, string> = {
      "ggst-local-time": "true",
      "ggst-plain-ratings": "false",
      "ggst-auto-update": "garbage",
      "ggst-timezone": "Asia/Tokyo",
    };
    expect(readPreferenceSeed((name) => cookies[name])).toEqual({
      useLocalTime: true,
      disableRatingColors: false,
      autoUpdate: undefined,
      timeZone: "Asia/Tokyo",
    });
    expect(validTimeZone("not-a-time-zone")).toBeUndefined();
  });
  test("renders the same saved zone regardless of the server's local time zone", () => {
    const preferences = {
      ...DEFAULT_DISPLAY_PREFERENCES,
      useLocalTime: true,
      timeZone: "Asia/Tokyo",
    };
    expect(formatDisplayTime("2026-11-13 18:05:06", preferences)).toBe(
      "2026-11-14 03:05:06",
    );
    expect(formatDisplayTime("2026-11-13T18:05:06Z", preferences)).toBe(
      "2026-11-14 03:05:06",
    );
  });
  test("respects daylight saving transitions using the saved IANA zone", () => {
    const preferences = {
      ...DEFAULT_DISPLAY_PREFERENCES,
      useLocalTime: true,
      timeZone: "America/New_York",
    };
    expect(formatDisplayTime("2026-03-08 06:59:00", preferences)).toBe(
      "2026-03-08 01:59:00",
    );
    expect(formatDisplayTime("2026-03-08 07:00:00", preferences)).toBe(
      "2026-03-08 03:00:00",
    );
  });
  test("keeps UTC/default and non-date labels intact; invalid zones fall back safely", () => {
    expect(
      formatDisplayTime("2026-11-13 10:00:00", DEFAULT_DISPLAY_PREFERENCES),
    ).toBe("2026-11-13 10:00:00");
    expect(
      formatDisplayTime("Now", {
        ...DEFAULT_DISPLAY_PREFERENCES,
        useLocalTime: true,
      }),
    ).toBe("Now");
    expect(utcDate("N/A")).toBeNull();
    expect(
      formatDisplayTime("2026-11-13 10:00:00", {
        ...DEFAULT_DISPLAY_PREFERENCES,
        useLocalTime: true,
        timeZone: "invalid",
      }),
    ).toBe("2026-11-13 10:00:00");
  });
});
