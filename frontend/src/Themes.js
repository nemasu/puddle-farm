import { createTheme } from "@mui/material";

let Themes = new Map();

Themes.set('Sol', createTheme({
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
    typography: {
        pageHeader: {
            display: 'block',
            fontSize: 34,
            color: 'white',
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
  }));

  Themes.set('Ky', createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#217DBB',
      },
      secondary: {
        main: '#DDDBD5',
      },
      background: {
        default: '#282E30',
      },
    },
    typography: {
        pageHeader: {
            display: 'block',
            fontSize: 34,
            color: '#217DBB',
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
            backgroundColor: '#217DBB',
          },
        },
      },
    },
  }));

  export default Themes;