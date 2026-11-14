"use client";

import { createContext, useContext } from "react";
import {
  DEFAULT_DISPLAY_PREFERENCES,
  type DisplayPreferences,
} from "../lib/display-preferences";

export const DisplayPreferencesContext = createContext<{
  preferences: DisplayPreferences;
  updatePreferences: (patch: Partial<DisplayPreferences>) => void;
} | null>(null);
export function usePreferencesContext() {
  return useContext(DisplayPreferencesContext);
}
export function useDisplayPreferences() {
  return usePreferencesContext()?.preferences ?? DEFAULT_DISPLAY_PREFERENCES;
}
