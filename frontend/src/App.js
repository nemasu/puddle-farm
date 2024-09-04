import React from 'react';
import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';

import Player from './Player';
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
        main: '#C00000',
      },
      background: {
        default: '#171717',
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            variants: [
              {
                props: { variant: 'link'},
                style: {
                  textTransform: 'none',
                  color: '#F8B552',
                }
              }
            ],
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: '#811104',
          },
        },
      },
    },
  });

  return (
    <React.Fragment>
      <Box sx={{minWidth: 1300}}>
        <ThemeProvider theme={defaultTheme}>
          <CssBaseline enableColorScheme />
          <NavBar />
          <Routes>
              <Route
                exact
                path="/"
                element={<Top100 />}
              />

              <Route
                  path="/top100"
                  element={<Top100 />}
              />

              <Route
                  path="/player/:player_id/:char_short/:game_count?"
                  element={<Player />}
              />

              <Route
                  path="*"
                  element={<Navigate to="/" />}
              />
          </Routes>
            
        </ThemeProvider>
      </Box>
    </React.Fragment>
  );
};

export default App;