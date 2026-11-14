import { render, screen } from "@testing-library/react";
import { PlayerRatingChange as RatingChangeLabel } from "../../../../src/components/classic/PlayerFormatting";
import { DisplayPreferencesContext } from "../../../../src/components/DisplayPreferences";
import { DEFAULT_DISPLAY_PREFERENCES } from "../../../../src/lib/display-preferences";

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
    render(
      <DisplayPreferencesContext
        value={{
          preferences: {
            ...DEFAULT_DISPLAY_PREFERENCES,
            disableRatingColors: true,
          },
          updatePreferences: () => {},
        }}
      >
        <RatingChangeLabel change={5} />
      </DisplayPreferencesContext>,
    );
    expect(screen.getByText("5")).toBeDefined();
    expect(screen.queryByText("+5")).toBeNull();
  });
});
