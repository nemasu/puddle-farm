import { createTheme } from '@mui/material/styles';

import React, { useEffect } from 'react';

const Top100 = () => {
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

  //const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;
  useEffect(() => {
  }, []);

  return (
    <React.Fragment>

    </React.Fragment>
  );
};

export default Top100;