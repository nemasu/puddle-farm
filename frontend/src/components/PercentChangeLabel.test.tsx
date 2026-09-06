import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { PercentChangeLabel } from "./PercentChangeLabel";

describe("PercentChangeLabel", () => {
  test("shows the percent formatted to 2 decimal places", () => {
    render(<PercentChangeLabel percent={60} />);
    expect(screen.getByText("60.00%")).toBeDefined();
  });

  test("rounds to 2 decimal places", () => {
    render(<PercentChangeLabel percent={49.999} />);
    expect(screen.getByText("50.00%")).toBeDefined();
  });
});
