import { getMessages } from "../../../src/lib/i18n";
import { en } from "../../../src/lib/i18n/en";
import { ja } from "../../../src/lib/i18n/ja";
import { ko } from "../../../src/lib/i18n/ko";
import {
  activeDesign,
  detectBrowserLanguage,
  parseSitePreferences,
  readSitePreferences,
  resolveDesign,
  SITE_COOKIES,
  type SitePreferences,
} from "../../../src/lib/site-preferences";

function read(values: Record<string, string>) {
  return readSitePreferences((name) => values[name]);
}

describe("language and design preferences", () => {
  it("defaults to English and Classic design without using the color theme", () => {
    expect(read({ "ggst-theme": "Sol", language: "ko" })).toEqual({
      language: "en",
      designPreference: "classic",
    });
  });

  it.each(["en", "ko", "ja"])(
    "defaults to Classic independently of language %s",
    (language) => {
      expect(read({ [SITE_COOKIES.language]: language }).designPreference).toBe(
        "classic",
      );
    },
  );

  it.each(["", "KO", "ko-KR", "ja-JP", "<script>"])(
    "rejects unsupported language cookie %p",
    (value) => {
      expect(read({ [SITE_COOKIES.language]: value }).language).toBe("en");
    },
  );

  it.each(["", "auto", "Classic", "unknown", "<script>"])(
    "rejects unsupported design cookie %p",
    (value) => {
      expect(read({ [SITE_COOKIES.design]: value }).designPreference).toBe(
        "classic",
      );
    },
  );

  it.each([
    ["en", "classic", "classic"],
    ["ko", "classic", "classic"],
    ["en", "ladder", "ladder"],
    ["ko", "ladder", "ladder"],
    ["ja", "classic", "classic"],
    ["ja", "ladder", "ladder"],
  ] as const)(
    "resolves %s / %s to %s",
    (language, designPreference, design) => {
      const preferences = read({
        [SITE_COOKIES.language]: language,
        [SITE_COOKIES.design]: designPreference,
      });
      expect(resolveDesign(preferences)).toBe(design);
    },
  );

  it("keeps the selected design across language changes", () => {
    for (const designPreference of ["classic", "ladder"] as const) {
      const preferences: SitePreferences = { language: "en", designPreference };
      expect(resolveDesign({ ...preferences, language: "ko" })).toBe(
        designPreference,
      );
      expect(activeDesign({ ...preferences, language: "ja" })).toBe(
        designPreference,
      );
    }
  });

  it.each([
    [null, "classic"],
    ["en", "auto"],
    ["ko", null],
    ["fr", "classic"],
    ["ko", "bad"],
    ["en", { value: "auto" }],
  ])("rejects invalid submitted values %p / %p", (language, design) => {
    expect(parseSitePreferences(language, design)).toBeNull();
  });
});

describe("translation dictionaries", () => {
  it("provides complete messages with nonempty text or before/after pairs", () => {
    for (const messages of [en, ko, ja]) {
      expect(Object.keys(messages).sort()).toEqual(Object.keys(en).sort());
      for (const namespace of Object.keys(en) as (keyof typeof en)[]) {
        const entries: Record<string, string> = messages[namespace];
        expect(Object.keys(entries).sort()).toEqual(
          Object.keys(en[namespace]).sort(),
        );
        for (const [key, value] of Object.entries(entries)) {
          const counterpart = key.endsWith("Before")
            ? `${key.slice(0, -6)}After`
            : key.endsWith("After")
              ? `${key.slice(0, -5)}Before`
              : null;
          const text =
            value.trim() || (counterpart && entries[counterpart]?.trim());
          expect({ [key]: text }).toEqual({
            [key]: expect.stringMatching(/\S/),
          });
        }
      }
    }
  });

  it("selects dictionaries independently without changing a previous request's messages", () => {
    const english = getMessages("en");
    expect(getMessages("ko").settings.title).toBe("설정");
    expect(english.settings.title).toBe("Settings");
  });
});

it("retains Japanese language selection", () => {
  expect(read({ [SITE_COOKIES.language]: "ja" }).language).toBe("ja");
  expect(getMessages("ja").settings.title).toBe("設定");
});

it.each([
  [null, "en"],
  ["fr-FR,de;q=0.8", "en"],
  ["ko-KR,ja;q=0.8,en;q=0.5", "ko"],
  ["JA-jp,en-US;q=0.8", "ja"],
  ["en-US,ja;q=0.9", "en"],
  ["ko;q=0.2,ja;q=0.9", "ja"],
  ["ko;q=0,ja;q=1", "ja"],
  ["ko;q=NaN,ja;q=2,en;q=0.5", "en"],
])("negotiates browser languages %p", (header, language) => {
  expect(detectBrowserLanguage(header)).toBe(language);
  expect(readSitePreferences(() => undefined, header).language).toBe(language);
});
it("explicit language cookies override the browser", () => {
  expect(
    readSitePreferences(
      (name) => (name === SITE_COOKIES.language ? "en" : undefined),
      "ko-KR",
    ).language,
  ).toBe("en");
});
