"use client";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { createContext, type ReactNode, useContext } from "react";
import type { LadderTheme } from "../../lib/site-preferences";

const light = {
  palette: {
    primary: { main: "#c8151c" },
    secondary: { main: "#111111" },
    background: { default: "#f1f1ed", paper: "#ffffff" },
  },
};
const dark = {
  palette: {
    primary: { main: "#ff7b83" },
    secondary: { main: "#25e7d4" },
    background: { default: "#151419", paper: "#24232b" },
    text: { primary: "#f5f2f5", secondary: "#b9b4c1" },
  },
};

function createLadderTheme(preference: LadderTheme) {
  return createTheme({
    defaultColorScheme: preference === "dark" ? "dark" : "light",
    colorSchemes: {
      light: preference !== "dark" && light,
      dark: preference !== "light" && dark,
    },
    cssVariables: {
      rootSelector: `html[data-ladder-theme="${preference}"]`,
      colorSchemeSelector: "media",
      cssVarPrefix: "ladder-mui",
      disableCssColorScheme: true,
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
          head: { backgroundColor: "var(--solid)", color: "#ffffff" },
          root: { borderColor: "var(--line)" },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: "none", boxShadow: "none" },
        },
      },
    },
  });
}

const themes = {
  auto: createLadderTheme("auto"),
  light: createLadderTheme("light"),
  dark: createLadderTheme("dark"),
};
const LadderThemeContext = createContext<LadderTheme | null>(null);

export function LadderThemeProvider({
  children,
  preference,
}: {
  children: ReactNode;
  preference: LadderTheme;
}) {
  return (
    <LadderThemeContext value={preference}>
      <ThemeProvider theme={themes[preference]} storageManager={null}>
        {children}
      </ThemeProvider>
    </LadderThemeContext>
  );
}

export function useDarkLadderTheme() {
  const preference = useContext(LadderThemeContext);
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)");
  return preference === "dark" || (preference === "auto" && systemDark);
}
