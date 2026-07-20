import { ThemeProvider } from "@mui/material/styles";
import { type ReactNode, useEffect, useState } from "react";
import { StorageUtils } from "../utils/Storage";
import Themes, {
  defaultCharacterName,
  defaultTheme,
  isCharacterName,
} from "../utils/Themes";

const ThemeManager = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<string>(defaultCharacterName);

  useEffect(() => {
    const theme = StorageUtils.getTheme();

    if (theme) {
      setTheme(theme);
    } else {
      setTheme(defaultCharacterName);
    }
  }, []);

  return (
    <ThemeProvider
      theme={isCharacterName(theme) ? Themes[theme] : defaultTheme}
    >
      {children}
    </ThemeProvider>
  );
};

export default ThemeManager;
