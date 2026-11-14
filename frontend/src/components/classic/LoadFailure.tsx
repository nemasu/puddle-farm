import { Typography } from "@mui/material";

export function LoadFailure({ subject }: { subject: string }) {
  return (
    <Typography role="alert" color="error" sx={{ m: 3 }}>
      Could not load {subject}. Please try again later.
    </Typography>
  );
}
