import { useEffect, useState } from 'react';
import Themes from './Themes';
import { ThemeProvider } from '@mui/material/styles';

const ThemeManager = ({children}) => {
    const [theme, setTheme] = useState('Sol');

    useEffect(() => {
        const theme = localStorage.getItem('theme');
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