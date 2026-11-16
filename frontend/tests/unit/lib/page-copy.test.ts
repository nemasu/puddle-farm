import { getClassicMessages, getPageCopy } from "../../../src/lib/i18n/classic";
import type { Design, Language } from "../../../src/lib/site-preferences";

it.each<[Design, Language, string]>([
  ["classic", "en", "Legacy English"],
  ["classic", "ko", "Legacy English"],
  ["classic", "ja", "設定"],
  ["ladder", "en", "Settings"],
  ["ladder", "ko", "설정"],
  ["ladder", "ja", "設定"],
])("selects page copy for %s/%s", (design, language, expected) => {
  expect(
    getPageCopy(
      { design, language },
      "Legacy English",
      (messages) => messages.settings.title,
    ),
  ).toBe(expected);
});
it("keeps Classic message selection independent from Ladder language", () => {
  expect(getClassicMessages("ko").settings.title).toBe("Settings");
  expect(getClassicMessages("ja").settings.title).toBe("設定");
});
