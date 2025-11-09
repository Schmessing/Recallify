// app/settingsProvider.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
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
  const dbFile = `${FileSystem.documentDirectory ?? ''}SQLite/app.db`;
  const backupFile = `${FileSystem.documentDirectory ?? ''}SQLite/app_backup.db`;

  const saveDB = async () => {
    try {
      const info = await FileSystem.getInfoAsync(dbFile);
      if (!info.exists) return Alert.alert('No database found');
      await FileSystem.copyAsync({ from: dbFile, to: backupFile });
      Alert.alert('Database saved!');
    } catch (e) { Alert.alert('Failed to save database', String(e)); }
  };

  const restoreDB = async () => {
    try {
      const info = await FileSystem.getInfoAsync(backupFile);
      if (!info.exists) return Alert.alert('No backup found');
      await FileSystem.copyAsync({ from: backupFile, to: dbFile });
      Alert.alert('Database restored!');
    } catch (e) { Alert.alert('Failed to restore database', String(e)); }
  };

  const clearDB = async () => {
    try {
      await FileSystem.deleteAsync(dbFile, { idempotent: true });
      Alert.alert('Database cleared!');
    } catch (e) { Alert.alert('Failed to clear database', String(e)); }
  };

  return (
    <SettingsContext.Provider value={{
      language, setLanguage,
      formality, setFormality,
      darkMode, setDarkMode,
      notificationsEnabled, setNotificationsEnabled,
      apiUrls, setApiUrls, theme,
      saveDB, restoreDB, clearDB
    }}>
      {children}
    </SettingsContext.Provider>
  );
}
