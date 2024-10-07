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

Themes.set('Nagoriyuki', createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#60304f',
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
      color: '#da2a46',
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
                color: '#da2a46',
              }
            }
          ],
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#60304f',
        },
      },
    },
  },
}));

Themes.set('Bedman?', createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#471d37',
    },
    secondary: {
      main: '#a83b5e',
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
          backgroundColor: '#471d37',
        },
      },
    },
  },
}));

  export default Themes;
