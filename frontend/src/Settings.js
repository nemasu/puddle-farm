import React, { useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { JSONParse } from 'json-with-bigint';

const Settings = () => {
    const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

    const navigate = useNavigate();

    const [key, setKey] = React.useState('');

    const [settings, setSettings] = React.useState({});
    useEffect(() => {

        const key = localStorage.getItem('key');
        setKey(key);

        const fetchSettings = async () => {

            //Get status from backend
            const url = API_ENDPOINT
            + '/settings/'
            + key;
            const response = await fetch(url);
            const result = await response.text().then(body => {
                var parsed = JSONParse(body);
                return parsed;
              });

            setSettings(result);
        }

        fetchSettings();
    }, [key]);

    function toggleStatus() {
        const url = API_ENDPOINT
        + '/toggle_private/'
        + key;
        
        fetch(url)
            .then(response => JSONParse(response))
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
                        variant="pageHeader"
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/player/${settings.id}`)}
                    >
                        {settings.name}'s Settings
                    </Typography>

                    <Box sx={{margin: 10}}>
                        Your profile is: {settings.status} <br />
                        Click <Button onClick={toggleStatus}>HERE</Button> to toggle.
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