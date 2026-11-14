import { act, cleanup, render, screen } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { PlayerAutoRefresh } from "../../../../src/components/classic/PlayerControls";
import { StorageUtils } from "../../../../src/utils/storage";

jest.mock("next/navigation", () => ({ useRouter: jest.fn() }));
const router = { refresh: jest.fn() };
beforeEach(() => {
  jest
    .mocked(useRouter)
    .mockReturnValue(router as unknown as ReturnType<typeof useRouter>);
});

afterEach(() => {
  cleanup();
  jest.useRealTimers();
  StorageUtils.setAutoUpdate(null);
  router.refresh.mockClear();
});

test("auto-update refreshes server content after 120 seconds without an initial fetch", async () => {
  jest.useFakeTimers();
  StorageUtils.setAutoUpdate(true);
  render(<PlayerAutoRefresh />);
  expect(router.refresh).not.toHaveBeenCalled();
  expect(screen.getByText(/Auto-update in: 120 seconds/)).toBeTruthy();
  await act(async () => {
    await jest.advanceTimersByTimeAsync(120_000);
  });
  expect(router.refresh).toHaveBeenCalledTimes(1);
});

test("auto-update stays disabled when the preference is unset", async () => {
  jest.useFakeTimers();
  StorageUtils.setAutoUpdate(null);
  render(<PlayerAutoRefresh />);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(120_000);
  });
  expect(router.refresh).not.toHaveBeenCalled();
  expect(screen.queryByText(/Auto-update in:/)).toBeNull();
});
