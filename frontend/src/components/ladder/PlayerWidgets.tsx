"use client";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import type { ReactNode } from "react";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#c8151c" },
    secondary: { main: "#111111" },
    background: { default: "#f1f1ed", paper: "#ffffff" },
  },
  shape: { borderRadius: 0 },
  typography: {
    fontFamily: '"Roboto", system-ui, sans-serif',
    button: { fontWeight: 700 },
  },
  components: {
    MuiButton: {
      styleOverrides: { root: { borderWidth: 2, textTransform: "none" } },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { backgroundColor: "#111111", color: "#ffffff" },
        root: { borderColor: "#bdbdb6" },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: "none", boxShadow: "none" } },
    },
  },
});

export function PlayerWidgets({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
