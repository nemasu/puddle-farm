import {
  characterLabel,
  getCharacterArt,
} from "../../../src/lib/ladder-characters";

it.each([
  ["NA", "나고리유키", "名残雪"],
  ["HA", "해피 케이오스", "ハッピーケイオス"],
  ["BE", "베드맨?", "ベッドマン？"],
  ["AS", "아스카 R♯", "飛鳥＝R♯"],
  ["DI", "퀸 디지", "ディズィー"],
  ["BA", "바이켄", "梅喧"],
  ["JA", "잼", "紗夢"],
])("uses official local names for %s", (short, korean, japanese) => {
  expect(characterLabel(short, "API name", "ko")).toBe(korean);
  expect(characterLabel(short, "API name", "ja")).toBe(japanese);
  expect(getCharacterArt(short)?.art).toBeTruthy();
});

it("retains English names and falls back safely for unknown characters", () => {
  expect(characterLabel("SO", "API name", "en")).toBe("Sol Badguy");
  for (const language of ["en", "ko", "ja"] as const) {
    expect(characterLabel("UNKNOWN", "API name", language)).toBe("API name");
    expect(characterLabel("UNKNOWN", "", language)).toBe("UNKNOWN");
    expect(characterLabel("toString", "API name", language)).toBe("API name");
  }
});
