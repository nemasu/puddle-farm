"use client";

import Typography from "@mui/material/Typography";
import { useCountdown } from "../../hooks/useCountdown";

export function UpdateCountdown({
  updateAt,
  renderedAt,
  includeHours = false,
}: {
  updateAt: number;
  renderedAt: number;
  includeHours?: boolean;
}) {
  const { secondsLeft: seconds } = useCountdown(updateAt, renderedAt);
  const minutes = includeHours
    ? Math.floor((seconds % 3600) / 60)
    : Math.floor(seconds / 60);
  const display = `${includeHours ? `${Math.floor(seconds / 3600)}:` : ""}${includeHours ? String(minutes).padStart(2, "0") : minutes}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <Typography align="left" sx={{ mb: includeHours ? 2 : 1 }}>
      {seconds > 0 ? `Next update in: ${display}` : "Updating..."}
    </Typography>
  );
}
