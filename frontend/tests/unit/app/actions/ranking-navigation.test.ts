import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { selectRankingCharacter } from "../../../../src/app/actions/ranking-navigation";
import { getCharacters } from "../../../../src/lib/server/characters";

jest.mock("next/headers", () => ({ headers: jest.fn() }));
jest.mock("next/navigation", () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));
jest.mock("../../../../src/lib/server/characters", () => ({
  getCharacters: jest.fn(),
}));

beforeEach(() => {
  jest
    .mocked(headers)
    .mockResolvedValue(
      new Headers() as unknown as Awaited<ReturnType<typeof headers>>,
    );
  jest.mocked(getCharacters).mockResolvedValue({ SO: "Sol", KY: "Ky" });
});
async function select(character: string) {
  const form = new FormData();
  form.set("character", character);
  return selectRankingCharacter(form);
}
it.each([false, true])(
  "uses a local path for enhanced=%p",
  async (enhanced) => {
    jest.mocked(headers).mockResolvedValue(
      new Headers({
        origin: "null",
        host: "internal:3000",
        "x-forwarded-host": "untrusted.example",
        "x-forwarded-proto": "http",
        ...(enhanced ? { "next-action": "action-id" } : {}),
      }) as unknown as Awaited<ReturnType<typeof headers>>,
    );
    const path = enhanced ? "/top/KY" : "/top/KY";
    await expect(select("KY")).rejects.toThrow(`redirect:${path}`);
    expect(redirect).toHaveBeenLastCalledWith(path);
  },
);
it.each(["", "../admin", "__proto__", "unknown"])(
  "falls back for unsupported selection %p",
  async (character) => {
    await expect(select(character)).rejects.toThrow("redirect:/top_global");
  },
);
it("keeps global navigation available when the character list fails", async () => {
  jest.mocked(getCharacters).mockRejectedValue(new Error("Unavailable"));
  await expect(select("SO")).rejects.toThrow("redirect:/top_global");
});
