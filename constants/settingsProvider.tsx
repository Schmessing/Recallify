// app/settingsProvider.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import { useSQLiteContext } from 'expo-sqlite';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { Colors } from './theme';

type ApiUrls = {
  ocrUrl: string; ocrKey: string;
  assemblyAIKey: string;
  googletranscriptUrl: string; googletranscriptKey: string;
  geminiKey: string;
};

type SettingsContextType = {
  language: string; setLanguage: (v: string) => void;
  formality: number; setFormality: (v: number) => void;
  darkMode: boolean; setDarkMode: (v: boolean) => void;
  apiUrls: ApiUrls; setApiUrls: (u: Partial<ApiUrls>) => void;
  theme: typeof Colors.light;
  dbSize: number;
  saveDB: () => Promise<void>;
  restoreDB: () => Promise<void>;
  clearDB: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextType | null>(null);

const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};

function SettingsProvider({ children }: { children: React.ReactNode }) {
  const defaultApiUrls: ApiUrls = {
    ocrUrl: 'https://api.ocr.space/parse/image',
    ocrKey: 'K84996160788957',
    assemblyAIKey: '9d5f8494428f49b6aabedf950ad49d21',
    googletranscriptUrl: 'https://speech.googleapis.com/v1/speech:recognize',
    googletranscriptKey: 'AIzaSyBz3uzo8P4eH6tw2ZEPHqtfZVv3IJkgPi8',
    geminiKey: 'AIzaSyA3tBRyfZuYH33JJVmJleoRkiBR1u5Q3gQ',
  };

  const [loadingSettings, setLoadingSettings] = useState(true);
  const [language, setLanguage] = useState('en');
  const [formality, setFormality] = useState(3);
  const [darkMode, setDarkMode] = useState(false);
  const [apiUrls, setApiUrlsState] = useState<ApiUrls>(defaultApiUrls);
  const [dbSize, setDbSize] = useState(0);

  const theme = useMemo(() => (darkMode ? Colors.dark : Colors.light), [darkMode]);

  const setApiUrls = (patch: Partial<ApiUrls>) => {
    setApiUrlsState(prev => {
      const updated = { ...prev, ...patch };
      AsyncStorage.setItem('appSettings', JSON.stringify({
        language,
        formality,
        darkMode,
        apiUrls: updated
      })).catch(e => console.warn('Failed to save API keys:', e));
      return updated;
    });
  };

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
          setApiUrlsState(s.apiUrls ?? defaultApiUrls);
        }
      } catch (e) {
        console.warn('Failed to load settings:', e);
      } finally {
        setLoadingSettings(false);
      }
    })();
  }, []);

  // ---------- persist general settings on change ----------
  useEffect(() => {
    if (!loadingSettings) {
      AsyncStorage.setItem('appSettings', JSON.stringify({
        language,
        formality,
        darkMode,
        apiUrls
      })).catch(e => console.warn('Failed to persist settings:', e));
    }
  }, [language, formality, darkMode, apiUrls, loadingSettings]);

  // ---------- DB helpers ----------
  const database = useSQLiteContext();
  const dbPath = database.databasePath;

  // Only construct File if dbPath is absolute
  const dbFile = dbPath.startsWith('file://') ? new File(dbPath) : new File(`file://${dbPath}`);
  const backupFile = new File(dbFile.uri.replace("app.db", "app_backup.db"));

  const refreshDbSize = async () => {
    try {
      const info = await dbFile.info();
      setDbSize(info.exists ? info.size ?? 0 : 0);
    } catch {
      setDbSize(0);
    }
  };

  const saveDB = async () => {
    try {
      const info = await dbFile.info();
      if (!info.exists) return Alert.alert("No database found");
      await dbFile.copy(backupFile);
      Alert.alert("Database saved!");
      refreshDbSize();
    } catch (e) {
      Alert.alert("Failed to save database", String(e));
    }
  };

  const restoreDB = async () => {
    try {
      const info = await backupFile.info();
      if (!info.exists) return Alert.alert("No backup found");
      await backupFile.copy(dbFile);
      Alert.alert("Database restored!");
      refreshDbSize();
    } catch (e) {
      Alert.alert("Failed to restore database", String(e));
    }
  };

  const clearDB = async () => {
    try {
      const info = await dbFile.info();
      if (!info.exists) return Alert.alert("No database found");
      await dbFile.delete();
      Alert.alert("Database cleared!");
      refreshDbSize();
    } catch (e) {
      Alert.alert("Failed to clear database", String(e));
    }
  };

  useEffect(() => {
    refreshDbSize();
  }, []);

  if (loadingSettings) return null;

  return (
    <SettingsContext.Provider value={{
      language, setLanguage,
      formality, setFormality,
      darkMode, setDarkMode,
      apiUrls, setApiUrls,
      theme,
      saveDB, restoreDB, clearDB,
      dbSize
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export default SettingsProvider;
export { SettingsContext, useSettings };

