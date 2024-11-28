import { createTheme } from "@mui/material";

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    platform: true;
    char_rank: true;
    global_rank: true;
    pageHeader: true;
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    link: true;
  }
}

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
  components: {
    MuiTypography: {
      styleOverrides: {
        root: {
          variants: [
            {
              props: { variant: 'pageHeader' },
              style: {
                display: 'block',
                fontSize: 34,
                color: 'white',
              }
            },
            {
              props: { variant: 'platform' },
              style: {
                fontSize: '.8rem',
                backgroundColor: '#363636',
                color: 'white',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'inline-block',
                marginLeft: '8px',
                top: '-4px',
                position: 'relative',
              }
            },
            {
              props: { variant: 'char_rank' },
              style: {
                fontSize: '.8rem',
                backgroundColor: '#811104',
                color: 'white',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'inline-block',
                marginLeft: '8px',
                top: '-4px',
                position: 'relative',
              }
            },
            {
              props: { variant: 'global_rank' },
              style: {
                fontSize: '.8rem',
                backgroundColor: 'rgb(255, 224, 138)',
                color: 'rgba(0, 0, 0, 0.7)',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'inline-block',
                marginLeft: '8px',
                top: '-4px',
                position: 'relative',
              }
            }
          ],
        }
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          color: '#C00000',
          borderWidth: '4px',
          variants: [
            {
              props: { variant: 'link' },
              style: {
                textTransform: 'none',
                color: '#F8B552',
                padding: '5px 0px 5px 0px',
                justifyContent: 'left',
                verticalAlign: 'baseline',
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
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: '#171717',
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
  components: {
    MuiTypography: {
      styleOverrides: {
        root: {
          variants: [
            {
              props: { variant: 'pageHeader' },
              style: {
                display: 'block',
                fontSize: 34,
                color: '#217DBB',
              }
            },
            {
              props: { variant: 'platform' },
              style: {
                fontSize: '.8rem',
                backgroundColor: '#363636',
                color: 'white',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'inline-block',
                marginLeft: '8px',
                top: '-4px',
                position: 'relative',
              }
            },
            {
              props: { variant: 'char_rank' },
              style: {
                fontSize: '.8rem',
                backgroundColor: '#217DBB',
                color: 'white',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'inline-block',
                marginLeft: '8px',
                top: '-4px',
                position: 'relative',
              }
            },
            {
              props: { variant: 'global_rank' },
              style: {
                fontSize: '.8rem',
                backgroundColor: 'rgb(255, 224, 138)',
                color: 'rgba(0, 0, 0, 0.7)',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'inline-block',
                marginLeft: '8px',
                top: '-4px',
                position: 'relative',
              }
            }
          ],
        }
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          color: '#DDDBD5',
          borderWidth: '4px',
          variants: [
            {
              props: { variant: 'link' },
              style: {
                textTransform: 'none',
                color: '#F8B552',
                padding: '5px 0px 5px 0px',
                justifyContent: 'left',
                verticalAlign: 'baseline',
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
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: '#282E30',
        },
      },
    },
  },
}));

Themes.set('Ramlethal', createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#611A16', //Mostly just button border, also alias box background
    },
    secondary: {
      main: '#E4E1DA', //Header (not appbar)
    },
    background: {
      default: '#383733',//Main page background
    },
  },
  components: {
    MuiTypography: {
      styleOverrides: {
        root: {
          variants: [
            {
              props: { variant: 'pageHeader' },
              style: {
                display: 'block',
                fontSize: 34,
                color: '#383733',//Page header text color
              }
            },
            {
              props: { variant: 'platform' },
              style: {
                fontSize: '.8rem',
                backgroundColor: '#383733',
                color: 'white',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'inline-block',
                marginLeft: '8px',
                top: '-4px',
                position: 'relative',
              }
            },
            {
              props: { variant: 'char_rank' },
              style: {
                fontSize: '.8rem',
                backgroundColor: '#611A16',
                color: 'white',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'inline-block',
                marginLeft: '8px',
                top: '-4px',
                position: 'relative',
              }
            },
            {
              props: { variant: 'global_rank' },
              style: {
                fontSize: '.8rem',
                backgroundColor: '#A4FD33',
                color: 'rgba(0, 0, 0, 0.7)',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'inline-block',
                marginLeft: '8px',
                top: '-4px',
                position: 'relative',
              }
            }
          ],
        }
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          color: '#DDDBD5',
          borderWidth: '4px', //Only applies to 'outlined' variant
          variants: [
            {
              props: { variant: 'link' },
              style: {
                textTransform: 'none',
                color: '#A4FD33',
                padding: '5px 0px 5px 0px',
                justifyContent: 'left',
                verticalAlign: 'baseline',
              }
            },
          ],
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#611A16',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: '#383733',
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
  components: {
    MuiTypography: {
      styleOverrides: {
        root: {
          variants: [
            {
              props: { variant: 'pageHeader' },
              style: {
                display: 'block',
                fontSize: 34,
                color: '#DA2A46',
              }
            },
            {
              props: { variant: 'platform' },
              style: {
                fontSize: '.8rem',
                backgroundColor: '#363636',
                color: 'white',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'inline-block',
                marginLeft: '8px',
                top: '-4px',
                position: 'relative',
              }
            },
            {
              props: { variant: 'char_rank' },
              style: {
                fontSize: '.8rem',
                backgroundColor: '#60304f',
                color: 'white',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'inline-block',
                marginLeft: '8px',
                top: '-4px',
                position: 'relative',
              }
            },
            {
              props: { variant: 'global_rank' },
              style: {
                fontSize: '.8rem',
                backgroundColor: '#DA2A46',
                color: 'rgba(0, 0, 0, 0.7)',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'inline-block',
                marginLeft: '8px',
                top: '-4px',
                position: 'relative',
              }
            }
          ],
        }
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          color: '#DDDBD5',
          borderWidth: '4px',
          variants: [
            {
              props: { variant: 'link' },
              style: {
                textTransform: 'none',
                color: '#DA2A46',
                padding: '5px 0px 5px 0px',
                justifyContent: 'left',
                verticalAlign: 'baseline',
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
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: '#282E30',
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
      main: '#A83B5E',
    },
    background: {
      default: '#171717',
    },
  },
  components: {
    MuiTypography: {
      styleOverrides: {
        root: {
          variants: [
            {
              props: { variant: 'pageHeader' },
              style: {
                display: 'block',
                fontSize: 34,
                color: 'white',
              }
            },
            {
              props: { variant: 'platform' },
              style: {
                fontSize: '.8rem',
                backgroundColor: '#363636',
                color: 'white',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'inline-block',
                marginLeft: '8px',
                top: '-4px',
                position: 'relative',
              }
            },
            {
              props: { variant: 'char_rank' },
              style: {
                fontSize: '.8rem',
                backgroundColor: '#471d37',
                color: 'white',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'inline-block',
                marginLeft: '8px',
                top: '-4px',
                position: 'relative',
              }
            },
            {
              props: { variant: 'global_rank' },
              style: {
                fontSize: '.8rem',
                backgroundColor: 'rgb(255, 224, 138)',
                color: 'rgba(0, 0, 0, 0.7)',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'inline-block',
                marginLeft: '8px',
                top: '-4px',
                position: 'relative',
              }
            }
          ],
        }
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          color: '#A83B5E',
          borderWidth: '4px',
          variants: [
            {
              props: { variant: 'link' },
              style: {
                textTransform: 'none',
                color: '#F8B552',
                padding: '5px 0px 5px 0px',
                justifyContent: 'left',
                verticalAlign: 'baseline',
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
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: '#171717',
        },
      },
    },
  },
}));

export default Themes;
