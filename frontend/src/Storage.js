// storage.js

const STORAGE_KEYS = {
    API_KEY: 'key',
    THEME: 'theme',
    useLocalTime: 'useLocalTime',
    disableRatingColors: 'disableRatingColors',
    autoUpdate: 'autoUpdate',
};

const Storage = {
    // Set item with optional expiry
    set: (key, value = null) => {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            console.error('Storage.set error:', error);
            return false;
        }
    },

    // Get item (returns null if expired)
    get: (key) => {
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;
            return item;
        } catch (error) {
            console.error('Storage.get error:', error);
            return null;
        }
    },

    // Remove item
    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Storage.remove error:', error);
            return false;
        }
    },
};

// Utility functions
const StorageUtils = {
    // set API key
    setApiKey: (apiKey) => {
        return Storage.set(STORAGE_KEYS.API_KEY, apiKey);
    },

    // Get API key
    getApiKey: () => {
        return Storage.get(STORAGE_KEYS.API_KEY);
    },

    // Remove API key
    removeApiKey: () => {
        return Storage.remove(STORAGE_KEYS.API_KEY);
    },

    // set theme
    setTheme: (theme) => {
        return Storage.set(STORAGE_KEYS.THEME, theme);
    },

    //Get theme
    getTheme: () => {
        return Storage.get(STORAGE_KEYS.THEME);
    },

    // set useLocalTime
    setUseLocalTime: (useLocalTime) => {
        if (!useLocalTime) {
            return Storage.remove(STORAGE_KEYS.useLocalTime);
        }
        return Storage.set(STORAGE_KEYS.useLocalTime, useLocalTime);
    },

    //Get useLocalTime
    getUseLocalTime: () => {
        const value = Storage.get(STORAGE_KEYS.useLocalTime);
        return value ? Boolean(value) : null;
    },

    // set disableRatingColors
    setDisableRatingColors: (disableRatingColors) => {
        if (!disableRatingColors) {
            return Storage.remove(STORAGE_KEYS.disableRatingColors);
        }
        return Storage.set(STORAGE_KEYS.disableRatingColors, disableRatingColors);
    },

    //Get disableRatingColors
    getDisableRatingColors: () => {
        const value = Storage.get(STORAGE_KEYS.disableRatingColors);
        return value ? Boolean(value) : null;
    },

    // set autoUpdate
    setAutoUpdate: (autoUpdate) => {
        if (!autoUpdate) {
            return Storage.remove(STORAGE_KEYS.autoUpdate);
        }
        return Storage.set(STORAGE_KEYS.autoUpdate, autoUpdate);
    },

    //Get autoUpdate
    getAutoUpdate: () => {
        const value = Storage.get(STORAGE_KEYS.autoUpdate);
        return value ? Boolean(value) : null;
    },

    getPreferences: () => {
        return {
            useLocalTime: StorageUtils.getUseLocalTime(),
            disableRatingColors: StorageUtils.getDisableRatingColors(),
            autoUpdate: StorageUtils.getAutoUpdate(),
        };
    },

    savePreferences: (settings) => {
        StorageUtils.setUseLocalTime(settings.useLocalTime);
        StorageUtils.setDisableRatingColors(settings.disableRatingColors);
        StorageUtils.setAutoUpdate(settings.autoUpdate);

    },

};

export { StorageUtils };