import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { StorageUtils } from "../utils/storage";
import { RatingChangeLabel } from "./RatingChangeLabel";

afterEach(() => {
  StorageUtils.setDisableRatingColors(null);
});

describe("RatingChangeLabel", () => {
  test("shows a plus-prefixed value for a positive change", () => {
    render(<RatingChangeLabel change={5} />);
    expect(screen.getByText("+5")).toBeDefined();
  });

  test("shows an unprefixed value for a negative change", () => {
    render(<RatingChangeLabel change={-5} />);
    expect(screen.getByText("-5")).toBeDefined();
  });

  test("shows a plain, uncolored value when rating colors are disabled", () => {
    StorageUtils.setDisableRatingColors(true);
    render(<RatingChangeLabel change={5} />);
    expect(screen.getByText("5")).toBeDefined();
    expect(screen.queryByText("+5")).toBeNull();
  });
});
