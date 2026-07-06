import { ThemeProvider } from "@mui/material/styles";
import { type ReactNode, useEffect, useState } from "react";
import { StorageUtils } from "../utils/Storage";
import Themes from "../utils/Themes";

const ThemeManager = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState("Sol");

  useEffect(() => {
    const theme = StorageUtils.getTheme();

    if (theme) {
      setTheme(theme);
    } else {
      setTheme("Sol");
    }
  }, []);

  return <ThemeProvider theme={Themes.get(theme)}>{children}</ThemeProvider>;
};

export default ThemeManager;
