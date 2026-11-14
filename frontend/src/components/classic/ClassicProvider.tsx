"use client";

import { CssBaseline, ThemeProvider } from "@mui/material";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import {
  DEFAULT_DISPLAY_PREFERENCES,
  type DisplayPreferences,
  type PreferenceSeed,
  validTimeZone,
  writeDisplayCookie,
} from "../../lib/display-preferences";
import { StorageUtils } from "../../utils/storage";
import Themes, {
  defaultCharacterName,
  isCharacterName,
} from "../../utils/themes";
import { DisplayPreferencesContext } from "../DisplayPreferences";

export function ClassicProvider({
  initialTheme,
  initialPreferences = {},
  children,
}: {
  initialTheme?: string;
  initialPreferences?: PreferenceSeed;
  children: ReactNode;
}) {
  const router = useRouter();
  const [theme, setTheme] = useState(
    initialTheme && isCharacterName(initialTheme)
      ? initialTheme
      : defaultCharacterName,
  );

  const [preferences, setPreferences] = useState<DisplayPreferences>({
    ...DEFAULT_DISPLAY_PREFERENCES,
    ...Object.fromEntries(
      Object.entries(initialPreferences).filter(
        ([, value]) => value !== undefined,
      ),
    ),
  });
  useEffect(() => {
    const saved = StorageUtils.getTheme();
    const selected =
      initialTheme && isCharacterName(initialTheme)
        ? initialTheme
        : saved && isCharacterName(saved)
          ? saved
          : defaultCharacterName;
    const stored = StorageUtils.getPreferences();
    const next: DisplayPreferences = {
      useLocalTime: initialPreferences.useLocalTime ?? !!stored.useLocalTime,
      disableRatingColors:
        initialPreferences.disableRatingColors ?? !!stored.disableRatingColors,
      autoUpdate: initialPreferences.autoUpdate ?? !!stored.autoUpdate,
      timeZone:
        validTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone) ??
        initialPreferences.timeZone ??
        "UTC",
    };
    setTheme(selected);
    StorageUtils.setTheme(selected);
    setPreferences(next);
    StorageUtils.savePreferences(next);
    writeDisplayCookie("timeZone", next.timeZone);
    if (
      !initialTheme ||
      !isCharacterName(initialTheme) ||
      initialPreferences.useLocalTime === undefined ||
      initialPreferences.disableRatingColors === undefined ||
      initialPreferences.autoUpdate === undefined ||
      initialPreferences.timeZone !== next.timeZone
    )
      router.refresh();
  }, [
    initialTheme,
    initialPreferences.useLocalTime,
    initialPreferences.disableRatingColors,
    initialPreferences.autoUpdate,
    initialPreferences.timeZone,
    router,
  ]);
  const updatePreferences = (patch: Partial<DisplayPreferences>) => {
    const next = { ...preferences, ...patch };
    StorageUtils.savePreferences(next);
    writeDisplayCookie("timeZone", next.timeZone);
    setPreferences(next);
    router.refresh();
  };

  return (
    <ThemeProvider theme={Themes[theme]}>
      <CssBaseline enableColorScheme />
      <DisplayPreferencesContext value={{ preferences, updatePreferences }}>
        {children}
      </DisplayPreferencesContext>
    </ThemeProvider>
  );
}
