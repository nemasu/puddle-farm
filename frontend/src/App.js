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
import TopGlobal from './TopGlobal';
import TopPlayer from './TopPlayer';

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
              element={<TopGlobal />}
            />

            <Route
                path="/top_global/:count?/:offset?"
                element={<TopGlobal />}
            />

            <Route
                path="/top/:char_short/:count?/:offset?"
                element={<TopPlayer />}
            />

            <Route
                path="/player/:player_id/:char_short/:game_count?"
                element={<Player />}
            />

          </Routes>
            
        </ThemeProvider>
      </Box>
    </React.Fragment>
  );
};

export default App;