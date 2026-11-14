import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useRouter } from "next/navigation";
import { ClassicProvider } from "../../../../src/components/classic/ClassicProvider";
import { PlayerDateTime } from "../../../../src/components/classic/PlayerFormatting";
import { usePreferencesContext } from "../../../../src/components/DisplayPreferences";
import { DEFAULT_DISPLAY_PREFERENCES } from "../../../../src/lib/display-preferences";

jest.mock("next/navigation", () => ({ useRouter: jest.fn() }));
const router = { refresh: jest.fn() };
beforeEach(() => {
  jest
    .mocked(useRouter)
    .mockReturnValue(router as unknown as ReturnType<typeof useRouter>);
});

beforeEach(() => {
  history.replaceState(null, "", "/");
  localStorage.clear();
  router.refresh.mockClear();
  const options = Intl.DateTimeFormat().resolvedOptions();
  jest.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    ...options,
    timeZone: "UTC",
  });
});
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  for (const item of document.cookie.split(";")) {
    // biome-ignore lint/suspicious/noDocumentCookie: isolate public preference cookies between tests.
    document.cookie = `${item.split("=")[0].trim()}=; Path=/; Max-Age=0`;
  }
});

test("imports existing storage once, writes public cookies, and never copies unrelated storage", async () => {
  localStorage.setItem("useLocalTime", "true");
  localStorage.setItem("disableRatingColors", "true");
  localStorage.setItem("unrelatedKey", "unrelated-test-key");
  render(
    <ClassicProvider initialTheme="Sol">
      <PlayerDateTime value="2026-11-13 10:00:00" />
    </ClassicProvider>,
  );
  await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
  expect(document.cookie).toContain("ggst-local-time=true");
  expect(document.cookie).toContain("ggst-plain-ratings=true");
  expect(document.cookie).not.toContain("unrelated-test-key");
});

test("server cookie values override stale storage without an initialization refresh", () => {
  const options = Intl.DateTimeFormat().resolvedOptions();
  jest.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    ...options,
    timeZone: "Asia/Tokyo",
  });
  localStorage.setItem("useLocalTime", "false");
  render(
    <ClassicProvider
      initialTheme="Sol"
      initialPreferences={{
        ...DEFAULT_DISPLAY_PREFERENCES,
        useLocalTime: true,
        timeZone: "Asia/Tokyo",
      }}
    >
      <PlayerDateTime value="2026-11-13 10:00:00" />
    </ClassicProvider>,
  );
  expect(screen.getByText("2026-11-13 19:00:00")).toBeTruthy();
  expect(localStorage.getItem("useLocalTime")).toBe("true");
  expect(router.refresh).not.toHaveBeenCalled();
});

test("updates the saved zone when the browser's local zone changes", () => {
  const options = Intl.DateTimeFormat().resolvedOptions();
  jest.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    ...options,
    timeZone: "Asia/Tokyo",
  });
  render(
    <ClassicProvider
      initialTheme="Sol"
      initialPreferences={DEFAULT_DISPLAY_PREFERENCES}
    >
      <PlayerDateTime value="2026-11-13 10:00:00" />
    </ClassicProvider>,
  );
  expect(document.cookie).toContain("ggst-timezone=Asia%2FTokyo");
  expect(router.refresh).toHaveBeenCalledTimes(1);
});

function Toggle() {
  const context = usePreferencesContext();
  return (
    <button
      type="button"
      onClick={() => context?.updatePreferences({ disableRatingColors: true })}
    >
      Plain ratings
    </button>
  );
}
test("preference edits update storage and cookies before requesting new SSR content", () => {
  render(
    <ClassicProvider
      initialTheme="Sol"
      initialPreferences={DEFAULT_DISPLAY_PREFERENCES}
    >
      <Toggle />
    </ClassicProvider>,
  );
  fireEvent.click(screen.getByText("Plain ratings"));
  expect(localStorage.getItem("disableRatingColors")).toBe("true");
  expect(document.cookie).toContain("ggst-plain-ratings=true");
  expect(router.refresh).toHaveBeenCalledTimes(1);
});
