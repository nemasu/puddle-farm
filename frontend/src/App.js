import React from 'react';
import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import History from './History';
import NavBar from './NavBar';
import Top100 from './Top100';

const App = () => {
  const defaultTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#811104',
      },
      secondary: {
        main: '#c00000',
      },
      background: {
        default: '#171717',
      },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: '#C00000',
          },
        },
      },
    },
  });

  return (
    <React.Fragment>
      <ThemeProvider theme={defaultTheme}>
        <CssBaseline enableColorScheme />
        <NavBar />
          <Routes>
              <Route
                  exact
                  path="/top100"
                  element={<Top100 />}
              />

              <Route
                  path="/history/:player_id/:char_short/:game_count?"
                  element={<History />}
              />

              <Route
                  path="*"
                  element={<Navigate to="/" />}
              />
          </Routes>
          </ThemeProvider>
    </React.Fragment>
  );
};

export default App;