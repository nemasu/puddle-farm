import { useEffect, useState } from 'react';
import Themes from "../utils/Themes";
import { ThemeProvider } from '@mui/material/styles';
import { StorageUtils } from "../utils/Storage";

import { ReactNode } from 'react';

const ThemeManager = ({children}: {children: ReactNode}) => {
    const [theme, setTheme] = useState('Sol');

    useEffect(() => {
        const theme = StorageUtils.getTheme();

        if(theme) {
            setTheme(theme);
        } else {
            setTheme('Sol');
        }
        
    }, []);

    return (
        <ThemeProvider theme={Themes.get(theme)}>
            {children}
        </ThemeProvider>
    );
};

export default ThemeManager;