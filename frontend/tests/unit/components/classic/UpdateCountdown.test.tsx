import { render, screen } from "@testing-library/react";
import { UpdateCountdown } from "../../../../src/components/classic/UpdateCountdown";
import { ONE_DAY_MS, parseUtcTimestamp } from "../../../../src/utils/time";

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
});

afterEach(() => {
  jest.useRealTimers();
});

describe("UpdateCountdown", () => {
  test("shows the remaining time before the window elapses", () => {
    render(
      <UpdateCountdown
        updateAt={Number(parseUtcTimestamp("2025-12-31 00:00:01")) + ONE_DAY_MS}
        renderedAt={Date.now()}
        includeHours
      />,
    );
    expect(screen.getByText("Next update in: 0:00:01")).toBeDefined();
  });

  test('shows "Updating..." once the window has elapsed', () => {
    render(
      <UpdateCountdown
        updateAt={Number(parseUtcTimestamp("2025-12-30 00:00:00")) + ONE_DAY_MS}
        renderedAt={Date.now()}
        includeHours
      />,
    );
    expect(screen.getByText("Updating...")).toBeDefined();
  });

  test("respects a different interval, e.g. a 1-hour window", () => {
    render(
      <UpdateCountdown
        updateAt={Number(parseUtcTimestamp("2025-12-31 23:00:01")) + 3600_000}
        renderedAt={Date.now()}
        includeHours
      />,
    );
    expect(screen.getByText("Next update in: 0:00:01")).toBeDefined();
  });
});
