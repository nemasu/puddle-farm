"use client";

import { Typography } from "@mui/material";
import { formatDisplayTime, utcDate } from "../../lib/display-preferences";
import { Utils } from "../../utils/Utils";
import { useDisplayPreferences } from "../DisplayPreferences";

export function PlayerDateTime({ value }: { value: string }) {
  const preferences = useDisplayPreferences();
  return (
    <time dateTime={utcDate(value)?.toISOString()}>
      {formatDisplayTime(value, preferences)}
    </time>
  );
}

export function PlayerRatingChange({ change }: { change: number }) {
  const plain = useDisplayPreferences().disableRatingColors;
  return plain ? (
    change
  ) : (
    <Typography
      component="span"
      variant="inherit"
      sx={{
        pr: "3px",
        display: "inline",
        fontSize: "0.875rem",
        color: Utils.getRatingChangeColor(change),
      }}
    >
      {change >= 0 ? "+" : ""}
      {change}
    </Typography>
  );
}
