import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import HourlyPlayersChart from "../../../src/components/HourlyPlayersChart";

afterEach(() => jest.restoreAllMocks());

test.each([
  [700, 1760, ["500", "1,000", "1,500", "2,000"]],
  [78, 99, ["75", "80", "85", "90", "95", "100"]],
  [0, 99, ["0", "20", "40", "60", "80", "100"]],
  [78, 78, ["77", "78", "79"]],
  [0, 0, ["0", "1"]],
])(
  "rounds the Y-axis around a visible range of %i to %i",
  (low, high, ticks) => {
    render(
      <HourlyPlayersChart
        initialPoints={[
          { timestamp: 3600, players: low },
          { timestamp: 7200, players: high },
        ]}
      />,
    );

    const chart = screen.getByRole("img");
    const labels = chart.querySelectorAll("g > g > text");
    expect(Array.from(labels, (label) => label.textContent)).toEqual(ticks);
    const bottom = chart.querySelector("line")?.getAttribute("y1");
    expect(chart.querySelector("path[d$='Z']")?.getAttribute("d")).toContain(
      ` V ${bottom} H `,
    );
  },
);

test("starts at 30d and requests a newly selected range", async () => {
  const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ points: [{ timestamp: 3_600, players: 2 }] }),
  } as Response);
  render(<HourlyPlayersChart />);

  await screen.findByRole("img");
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
  jest.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: true,
    json: async () => ({ points: [] }),
  } as Response);
  const { unmount } = render(<HourlyPlayersChart />);
  await screen.findByText(/No hourly player history/);
  unmount();

  jest.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: false,
    status: 503,
  } as Response);
  render(<HourlyPlayersChart />);
  await screen.findByText(/Could not load hourly player history/);
});
