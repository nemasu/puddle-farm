import React, { useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { JSONParse } from 'json-with-bigint';

const Settings = () => {
    const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

    const navigate = useNavigate();

    const [key, setKey] = React.useState(null);

    const [settings, setSettings] = React.useState({});
    useEffect(() => {

        const fetchSettings = async () => {

            const key = localStorage.getItem('key');

            if( key === null ) {
                return;
            } 

            setKey(key);

            //Get status from backend
            const url = API_ENDPOINT
            + '/settings/'
            + key;
            const response = await fetch(url);

            if( response.status === 200 ) {
                const result = await response.text().then(body => {
                    var parsed = JSONParse(body);
                    return parsed;
                });

                setSettings(result);
                
                if(result.id === 0) {
                    localStorage.removeItem('key');
                    window.location.reload();
                }
            } else if ( response.status === 404 ) {
                localStorage.removeItem('key');
                window.location.reload();
            }
        }

        fetchSettings();
    }, [API_ENDPOINT]);

    function toggleStatus() {
        const url = API_ENDPOINT
        + '/toggle_private/'
        + key;
        
        fetch(url)
            .then(response => response)
            .then(result => {
                window.location.reload();
            });
    }

    return (
        <React.Fragment>
            {key !== null ? ( //If we have a key set
                <Box>
                    <Typography
                        align='center'
                        variant="h4"
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/player/${settings.id}`)}
                    >
                        {settings.name}'s Settings
                    </Typography>

                    <Box sx={{margin: 10}}>
                        Your profile is: {settings.status} <br />
                        Click <Button onClick={toggleStatus}>HERE</Button> to toggle.
                    </Box>

                    <Box sx={{ borderColor: '#F8B552', borderWidth: '2px', borderStyle: 'dashed', p: '20px', m: '50px'}}>
                        <Typography variant='body1'>Note: If you use the same browser, you can revisit this page without reauthenticating to change settings.</Typography>
                        <Typography variant='body1'>If you don't want that, click <Button onClick={() => {localStorage.removeItem('key'); window.location.reload();}}>here</Button> to clear browser data.</Typography>
                    </Box>
                </Box>

            ) : (//If we don't have a key set
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: '100vh',
                        textAlign: 'center',
                    }}
                >
                    <Typography variant="h6">
                        Use "claim profile" feature to access settings page.
                    </Typography>
                </Box>
            )}
        </React.Fragment>
    );
};

export default Settings;