// app/settingsProvider.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import * as SQLite from 'expo-sqlite';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { Colors } from './theme';

type ApiUrls = {
  ocrUrl: string; ocrKey: string;
  googletranscriptUrl: string; googletranscriptKey: string; 
  geminiKey: string;
};

type SettingsContextType = {
  language: string; setLanguage: (v: string) => void;
  formality: number; setFormality: (v: number) => void;
  darkMode: boolean; setDarkMode: (v: boolean) => void;
  notificationsEnabled: boolean; setNotificationsEnabled: (v: boolean) => void;
  apiUrls: ApiUrls; setApiUrls: (u: Partial<ApiUrls>) => void;
  theme: typeof Colors.light;
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
  // ---------- defaults ----------
  const defaultApiUrls: ApiUrls = {
    ocrUrl: 'https://api.ocr.space/parse/image',
    ocrKey: 'K84996160788957',
    googletranscriptUrl: 'https://speech.googleapis.com',
    googletranscriptKey: 'AIzaSyBz3uzo8P4eH6tw2ZEPHqtfZVv3IJkgPi8',
    geminiKey: 'AIzaSyA3tBRyfZuYH33JJVmJleoRkiBR1u5Q3gQ',
  };

  // ---------- state ----------
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [language, setLanguage] = useState('en');
  const [formality, setFormality] = useState<number>(3);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [apiUrls, setApiUrlsState] = useState<ApiUrls>(defaultApiUrls);
  const [dbSize, setDbSize] = useState(0);

  const theme = useMemo(() => (darkMode ? Colors.dark : Colors.light), [darkMode]);
  const setApiUrls = (patch: Partial<ApiUrls>) =>
    setApiUrlsState(prev => ({ ...defaultApiUrls, ...prev, ...patch }));

  // ---------- load settings ----------
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

          // merge apiUrls safely with defaults
          setApiUrlsState(prev => ({
          ...defaultApiUrls,
          ...prev,
          ...(s.apiUrls || {})
          }));
        }
      } catch (e) {
        console.warn('Failed to load settings:', e);
      }finally {
      setLoadingSettings(false);
    }
    })();
  }, []);

  // ---------- persist settings ----------
  useEffect(() => {
    if (!loadingSettings) { // PATCH: only save after load
      AsyncStorage.setItem('appSettings', JSON.stringify({
        language, formality, darkMode, notificationsEnabled, apiUrls
      }));
    }
  }, [language, formality, darkMode, notificationsEnabled, apiUrls, loadingSettings]);

  // ---------- notifications ----------
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
  const db = SQLite.openDatabase('app.db');
  const dbPath = db.databasePath;

  const dbFile = new File(dbPath);
  const backupFile = new File(dbPath.replace("app.db", "app_backup.db"));

  const saveDB = async () => {
    try {
      const info = await dbFile.info();
      if (!info.exists) {
        Alert.alert("No database found");
        return;
      }
      await dbFile.copy(backupFile);
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
      await backupFile.copy(dbFile);
      Alert.alert("Database restored!");
    } catch (e) {
      Alert.alert("Failed to restore database", String(e));
    }
  };

  const clearDB = async () => {
    try {
      await dbFile.delete();
      Alert.alert("Database cleared!");
    } catch (e) {
      Alert.alert("Failed to clear database", String(e));
    }
  };

  // ---------- DB size check ----------
  const checkDbSize = async () => {
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
    checkDbSize();
    const interval = setInterval(checkDbSize, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loadingSettings) return null;

  return (
    <SettingsContext.Provider value={{
      language, setLanguage,
      formality, setFormality,
      darkMode, setDarkMode,
      notificationsEnabled, setNotificationsEnabled,
      apiUrls, setApiUrls,
      theme,
      saveDB, restoreDB, clearDB,
      dbSize
    }}>
      {children}
    </SettingsContext.Provider>
  );
}
