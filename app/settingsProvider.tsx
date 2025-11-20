// app/settingsProvider.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { Colors } from '../constants/theme';

type ApiUrls = {
  ocrUrl: string; ocrKey: string;
  whisperUrl: string; whisperKey: string;
  geminiUrl: string; geminiKey: string;
};

type SettingsContextType = {
  // prefs
  language: string; setLanguage: (v: string) => void;
  formality: number; setFormality: (v: number) => void;
  darkMode: boolean; setDarkMode: (v: boolean) => void;
  notificationsEnabled: boolean; setNotificationsEnabled: (v: boolean) => void;

  // api
  apiUrls: ApiUrls; setApiUrls: (u: Partial<ApiUrls>) => void;

  // theme object (already resolved by darkMode)
  theme: typeof Colors.light;

  // DB helpers
  dbSize: number;
  saveDB: () => Promise<void>;
  restoreDB: () => Promise<void>;
  clearDB: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextType | null>(null);
export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // ---------- state ----------
  const [dbSize, setDbSize] = useState(0);
  const [language, setLanguage] = useState('en');
  const [formality, setFormality] = useState<number>(3);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [apiUrls, setApiUrlsState] = useState<ApiUrls>({
    ocrUrl: '', ocrKey: '',
    whisperUrl: '', whisperKey: '',
    geminiUrl: '', geminiKey: '',
  });

  const theme = useMemo(() => (darkMode ? Colors.dark : Colors.light), [darkMode]);

  const setApiUrls = (patch: Partial<ApiUrls>) =>
    setApiUrlsState(prev => ({ ...prev, ...patch }));

  // ---------- load/persist ----------
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('appSettings');
        if (saved) {
          const s = JSON.parse(saved);
          setLanguage(s.language ?? 'en');
          setFormality(s.formality ?? 3);
          setDarkMode(s.darkMode ?? false);
          setNotificationsEnabled(s.notificationsEnabled ?? false);
          setApiUrlsState(s.apiUrls ?? apiUrls);
        }
      } catch { /* ignore */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('appSettings', JSON.stringify({
      language, formality, darkMode, notificationsEnabled, apiUrls
    }));
  }, [language, formality, darkMode, notificationsEnabled, apiUrls]);

  // ---------- notifications permission ----------
  useEffect(() => {
    (async () => {
      if (!notificationsEnabled) return;
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied for notifications.');
        setNotificationsEnabled(false);
      }
    })();
  }, [notificationsEnabled]);

  // ---------- DB helpers ----------
  const dbFile = new File("SQLite/app.db");
  const backupFile = new File("SQLite/app_backup.db");

  const saveDB = async () => {
    try {
      const info = await dbFile.info();
      if (!info.exists) {
        Alert.alert("No database found");
        return;
      }

      await dbFile.copy(backupFile);  // File -> File
      Alert.alert("Database saved!");
    } catch (e) {
      Alert.alert("Failed to save database", String(e));
    }
  };

  const restoreDB = async () => {
    try {
      const info = await backupFile.info();
      if (!info.exists) {
        Alert.alert("No backup found");
        return;
      }

      await backupFile.copy(dbFile);  // File -> File
      Alert.alert("Database restored!");
    } catch (e) {
      Alert.alert("Failed to restore database", String(e));
    }
  };

  const clearDB = async () => {
    try {
      await dbFile.delete(); // NO arguments allowed
      Alert.alert("Database cleared!");
    } catch (e) {
      Alert.alert("Failed to clear database", String(e));
    }
  };

  // Optional: check DB size on interval
  const checkdbSize = async () => {
    try {
      const info = await dbFile.info();
      if (info.exists && info.size) {
        setDbSize(info.size / (1024 * 1024));
      } else {
        setDbSize(0);
      }
    } catch (e) {
      console.warn("Failed to check DB size:", e);
    }
  };

  useEffect(() => {
    checkdbSize();
    const interval = setInterval(checkdbSize, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SettingsContext.Provider value={{
      language, setLanguage,
      formality, setFormality,
      darkMode, setDarkMode,
      notificationsEnabled, setNotificationsEnabled,
      apiUrls, setApiUrls, theme,
      saveDB, restoreDB, clearDB, dbSize
    }}>
      {children}
    </SettingsContext.Provider>
  );
}
