import React, { useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
    const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

    const navigate = useNavigate();

    const [key, setKey] = React.useState('');

    const [status, setStatus] = React.useState('');

    useEffect(() => {

        const key = localStorage.getItem('key');
        setKey(key);

        const fetchSettings = async () => {

            //Get status from backend
            const url = API_ENDPOINT
            + '/settings/'
            + key;
            const response = await fetch(url);
            const result = await response.json();

            setStatus(result);
        }

        fetchSettings();
    }, [key]);

    function toggleStatus() {
        const url = API_ENDPOINT
        + '/toggle_private/'
        + key;
        
        fetch(url)
            .then(response => response.json())
            .then(result => {
                window.location.reload();
            });
    }

    return (
        <React.Fragment>
            {key !== null ? ( //If we have a key set

                <Box sx={{margin: 10}}>
                    Your profile is: {status} <br />
                    Click <Button onClick={toggleStatus}>HERE</Button> to toggle.
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