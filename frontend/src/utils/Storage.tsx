import { StorageOptions } from '../interfaces/Storage';

const STORAGE_KEYS = {
  THEME: 'theme',
  useLocalTime: 'useLocalTime',
  disableRatingColors: 'disableRatingColors',
  autoUpdate: 'autoUpdate',
};

const Storage = {
  // Set item with optional expiry
  set: (key: string, value: string | null = null) => {
      try {
          localStorage.setItem(key, value ?? '');
          return true;
      } catch (error) {
          console.error('Storage.set error:', error);
          return false;
      }
  },

  // Get item (returns null if expired)
  get: (key: string) => {
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
  remove: (key: string) => {
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
  // set theme
  setTheme: (theme: string) => {
      return Storage.set(STORAGE_KEYS.THEME, theme);
  },

  //Get theme
  getTheme: () => {
      return Storage.get(STORAGE_KEYS.THEME);
  },

  // set useLocalTime
  setUseLocalTime: (useLocalTime: boolean | null) => {
      if (!useLocalTime) {
          return Storage.remove(STORAGE_KEYS.useLocalTime);
      }
      return Storage.set(STORAGE_KEYS.useLocalTime, useLocalTime.toString());
  },

  //Get useLocalTime
  getUseLocalTime: () => {
      const value = Storage.get(STORAGE_KEYS.useLocalTime);
      return value ? Boolean(value) : null;
  },

  // set disableRatingColors
  setDisableRatingColors: (disableRatingColors: boolean | null) => {
      if (!disableRatingColors) {
          return Storage.remove(STORAGE_KEYS.disableRatingColors);
      }
      return Storage.set(STORAGE_KEYS.disableRatingColors, disableRatingColors.toString());
  },

  //Get disableRatingColors
  getDisableRatingColors: () => {
      const value = Storage.get(STORAGE_KEYS.disableRatingColors);
      return value ? Boolean(value) : null;
  },

  // set autoUpdate
  setAutoUpdate: (autoUpdate: boolean | null) => {
      if (!autoUpdate) {
          return Storage.remove(STORAGE_KEYS.autoUpdate);
      }
      return Storage.set(STORAGE_KEYS.autoUpdate, autoUpdate.toString());
  },

  //Get autoUpdate
  getAutoUpdate: () => {
      const value = Storage.get(STORAGE_KEYS.autoUpdate);
      return value ? Boolean(value) : null;
  },

  getPreferences: (): StorageOptions => {
      return {
          useLocalTime: StorageUtils.getUseLocalTime(),
          disableRatingColors: StorageUtils.getDisableRatingColors(),
          autoUpdate: StorageUtils.getAutoUpdate(),
      };
  },

  savePreferences: (settings: StorageOptions) => {
      StorageUtils.setUseLocalTime(settings.useLocalTime);
      StorageUtils.setDisableRatingColors(settings.disableRatingColors);
      StorageUtils.setAutoUpdate(settings.autoUpdate);
  },

};

export { StorageUtils };
export type { StorageOptions };
