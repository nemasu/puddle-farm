import { AppBar, Box, Typography } from "@mui/material";
import type { ReactNode } from "react";

export function PageHeading({ children }: { children: ReactNode }) {
  return (
    <AppBar
      position="static"
      style={{ backgroundImage: "none" }}
      sx={{ backgroundColor: "secondary.main" }}
    >
      <Box
        sx={{
          minHeight: { xs: 50, sm: 100 },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography align="center" variant="pageHeader" component="h1">
          {children}
        </Typography>
      </Box>
    </AppBar>
  );
}
