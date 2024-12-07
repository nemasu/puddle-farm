import { createTheme } from "@mui/material";

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    platform: true;
    char_rank: true;
    global_rank: true;
    pageHeader: true;
    playerName: true;
  }
}

let Themes = new Map();

Themes.set('Sol', createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#D2B45E',
    },
    secondary: {
      main: '#9B3725',
    },
    background: {
      default: '#262A2C',
    },
  },
  components: {
    MuiTypography: {
      styleOverrides: {
        root: {
          variants: [
            {
              props: { variant: 'playerName' }, //Name on player page
              style: {
                color: 'white',
                padding: '5px',
                paddingRight: '12px',
                paddingLeft: '12px',
                display: 'inline-block',
              }
            },
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
                backgroundColor: '#9B3725',
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
                backgroundColor: '#FFB42C',
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
          color: '#FFB42C',
          borderWidth: '4px',
          textTransform: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#2E2C2F',
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
              props: { variant: 'playerName' },
              style: {
                color: 'black',
                padding: '5px',
                paddingRight: '12px',
                paddingLeft: '12px',
                display: 'inline-block',
              }
            },
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
                backgroundColor: '#CF8545',
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
          color: '#CF8545',
          borderWidth: '4px',
          textTransform: 'none',
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
              props: { variant: 'playerName' },
              style: {
                color: 'black',
                padding: '5px',
                paddingRight: '12px',
                paddingLeft: '12px',
                display: 'inline-block',
              }
            },
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
          color: '#A4FD33',
          borderWidth: '4px', //Only applies to 'outlined' variant
          textTransform: 'none',
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
              props: { variant: 'playerName' },
              style: {
                color: 'black',
                padding: '5px',
                paddingRight: '12px',
                paddingLeft: '12px',
                display: 'inline-block',
              }
            },
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
          color: '#DA2A46',
          borderWidth: '4px',
          textTransform: 'none',
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

Themes.set('Bridget', createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#799BB6', //Mostly just button border, also alias box background
    },
    secondary: {
      main: '#799BB6', //Header (not appbar)
    },
    background: {
      default: '#35312E',//Main page background
    },
  },
  components: {
    MuiTypography: {
      styleOverrides: {
        root: {
          variants: [
            {
              props: { variant: 'playerName' },
              style: {
                color: 'white',
                padding: '5px',
                paddingRight: '12px',
                paddingLeft: '12px',
                display: 'inline-block',
              }
            },
            {
              props: { variant: 'pageHeader' },
              style: {
                display: 'block',
                fontSize: 34,
                color: '#D6D4CE',//Page header text color
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
                backgroundColor: '#5777A3',
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
                backgroundColor: '#A94F44',
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
          color: '#F5C74C',
          borderWidth: '4px', //Only applies to 'outlined' variant
          textTransform: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#5777A3',
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
              props: { variant: 'playerName' },
              style: {
                color: 'white',
                padding: '5px',
                paddingRight: '12px',
                paddingLeft: '12px',
                display: 'inline-block',
              }
            },
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
                backgroundColor: '#D02F28',
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
            }
          ],
        }
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          color: '#D02F28',
          borderWidth: '4px',
          textTransform: 'none',
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

Themes.set('Johnny', createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#927757', //Mostly just button border, also alias box background
    },
    secondary: {
      main: '#848280', //Header (not appbar)
    },
    background: {
      default: '#464541',//Main page background
    },
  },
  components: {
    MuiTypography: {
      styleOverrides: {
        root: {
          variants: [
            {
              props: { variant: 'playerName' },
              style: {
                color: 'white',
                padding: '5px',
                paddingRight: '12px',
                paddingLeft: '12px',
                display: 'inline-block',
              }
            },
            {
              props: { variant: 'pageHeader' },
              style: {
                display: 'block',
                fontSize: 34,
                color: '#D6D4CE',//Page header text color
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
                backgroundColor: '#353235',
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
                backgroundColor: '#C4A160',
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
          color: '#C4A160',
          borderWidth: '4px', //Only applies to 'outlined' variant
          textTransform: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#353235',
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

export default Themes;
