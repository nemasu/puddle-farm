import Typography from "@mui/material/Typography";
import { useCountdown } from "../hooks/useCountdown";
import type { DurationMs, EpochMs } from "../utils/time";
import { addDuration } from "../utils/time";
import { Utils } from "../utils/Utils";

export const UpdateCountdown = ({
  lastUpdateMs,
  intervalMs,
}: {
  lastUpdateMs: EpochMs;
  intervalMs: DurationMs;
}) => {
  const { secondsLeft } = useCountdown(addDuration(lastUpdateMs, intervalMs));

  return (
    <Typography align="left" sx={{ mb: 1 }}>
      {secondsLeft > 0
        ? `Next update in: ${Utils.formatCountdown(secondsLeft)}`
        : "Updating..."}
    </Typography>
  );
};
