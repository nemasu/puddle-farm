import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import HourlyPlayersChart from "./HourlyPlayersChart";

vi.mock("react-chartjs-2", () => ({
  Line: () => <div data-testid="hourly-chart" />,
}));

afterEach(() => vi.restoreAllMocks());

test("starts at 30d and requests a newly selected range", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ points: [{ timestamp: 3_600, players: 2 }] }),
  } as Response);
  render(<HourlyPlayersChart />);

  await screen.findByTestId("hourly-chart");
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining("range=30d"),
    expect.anything(),
  );

  fireEvent.click(screen.getByRole("button", { name: "7d" }));
  await waitFor(() =>
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining("range=7d"),
      expect.anything(),
    ),
  );
});

test("renders empty and request failure states", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: true,
    json: async () => ({ points: [] }),
  } as Response);
  const { unmount } = render(<HourlyPlayersChart />);
  await screen.findByText(/No hourly player history/);
  unmount();

  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: false,
    status: 503,
  } as Response);
  render(<HourlyPlayersChart />);
  await screen.findByText(/Could not load hourly player history/);
});
