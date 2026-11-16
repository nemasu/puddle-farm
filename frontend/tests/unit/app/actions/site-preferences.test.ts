import { cookies } from "next/headers";
import {
  saveDesignChoice,
  saveSitePreferences,
} from "../../../../src/app/actions/site-preferences";

jest.mock("next/headers", () => ({ cookies: jest.fn() }));

const set = jest.fn();
beforeEach(() => {
  set.mockClear();
  jest
    .mocked(cookies)
    .mockResolvedValue({ set } as unknown as Awaited<
      ReturnType<typeof cookies>
    >);
});

it.each([
  ["en", "classic"],
  ["ja", "classic"],
  ["ja", "ladder"],
  ["ko", "classic"],
  ["en", "ladder"],
])(
  "saves only validated presentation cookies for %s / %s",
  async (language, design) => {
    const form = new FormData();
    form.set("language", language);
    form.set("design", design);
    form.set("theme", "Sol");
    await saveSitePreferences(form);
    const options = { path: "/", maxAge: 31_536_000, sameSite: "lax" };
    expect(set.mock.calls).toEqual([
      ["ggst-language", language, options],
      ["ggst-design", design, options],
    ]);
  },
);

it.each([
  ["fr", "classic"],
  ["en", "auto"],
  ["ko", "unknown"],
  ["ko", ""],
])(
  "does not partially save invalid %s / %s input",
  async (language, design) => {
    const form = new FormData();
    form.set("language", language);
    form.set("design", design);
    await saveSitePreferences(form);
    expect(set).not.toHaveBeenCalled();
  },
);

it.each(["classic", "ladder"])(
  "invitation saves only design %s",
  async (design) => {
    const form = new FormData();
    form.set("design", design);
    await saveDesignChoice(form);
    expect(set.mock.calls).toEqual([
      [
        "ggst-design",
        design,
        { path: "/", maxAge: 31_536_000, sameSite: "lax" },
      ],
    ]);
  },
);
it("ignores invalid invitation choices", async () => {
  const form = new FormData();
  form.set("design", "auto");
  await saveDesignChoice(form);
  expect(set).not.toHaveBeenCalled();
});
