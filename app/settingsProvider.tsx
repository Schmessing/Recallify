import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';

export const SettingsContext = createContext<any>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<'en' | 'es'>('en');
  const [formality, setFormality] = useState(3);
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [apiUrls, setApiUrls] = useState({
    ocr: 'https://api.ocr.space/parse/image', // default OCR endpoint
    whisper: 'https://api.openai.com/v1/audio/transcriptions', // default Whisper endpoint
    gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent', // default Gemini endpoint
    ocrKey: 'K84231978688957',
    whisperKey: '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',
    geminiKey: 'AIzaSyC1_8veLmXy7rr7JlwkolJzlpyNnvSQT5E',
  });

  const [dbSize, setDbSize] = useState(0);
  const dbFile = new File('SQLite/app.db');
  const backupFile = new File('backup_app.db');

  // ---------------------------- LOAD SETTINGS ----------------------------
  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem('settings');
      if (stored) {
        const s = JSON.parse(stored);
        setLanguage(s.language || 'en');
        setFormality(s.formality || 3);
        setDarkMode(s.darkMode || false);
        setNotificationsEnabled(s.notificationsEnabled || false);
        setApiUrls(s.apiUrls || apiUrls);
      }
    })();
  }, []);

  // ---------------------------- SAVE SETTINGS ----------------------------
  useEffect(() => {
    AsyncStorage.setItem(
      'settings',
      JSON.stringify({ language, formality, darkMode, notificationsEnabled, apiUrls })
    );
  }, [language, formality, darkMode, notificationsEnabled, apiUrls]);

  // ---------------------------- NOTIFICATIONS ----------------------------
  useEffect(() => {
    const scheduleDailyReminder = async () => {
      if (!notificationsEnabled) {
        await Notifications.cancelAllScheduledNotificationsAsync();
        return;
      }
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Notifications are disabled');
        setNotificationsEnabled(false);
        return;
      }
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Study Reminder', body: 'Time to review your flashcards!' },
        trigger: { hour: 9, minute: 0, repeats: true } as any, // type: 'daily' no longer required
      });
    };
    scheduleDailyReminder();
  }, [notificationsEnabled, language]);

  // ---------------------------- STORAGE MANAGEMENT ----------------------------
  const checkDbSize = async () => {
    try {
      const info = await dbFile.info();
      if (info.exists && info.size) {
        setDbSize(info.size / (1024 * 1024)); // MB
        if (info.size > 10 * 1024 * 1024) await saveDataToFile();
      } else setDbSize(0);
    } catch (err) {
      console.error(err);
    }
  };

  const saveDataToFile = async () => {
    try {
      const info = await dbFile.info();
      if (!info.exists) {
        Alert.alert('No database found');
        return;
      }
      await dbFile.copy(backupFile);
      Alert.alert('Data saved to device');
    } catch (err: any) {
      Alert.alert('Failed to save data', err.message);
    }
  };

  const importSavedData = async () => {
    try {
      const info = await backupFile.info();
      if (!info.exists) {
        Alert.alert('No saved data found');
        return;
      }
      await backupFile.copy(dbFile);
      Alert.alert('Data restored from backup');
    } catch (err: any) {
      Alert.alert('Failed to restore data', err.message);
    }
  };

  const clearData = async () => {
    try {
      const folder = new File('SQLite');
      await folder.delete();
      Alert.alert('Database cleared (API URLs preserved)');
      checkDbSize();
    } catch (err: any) {
      Alert.alert('Failed to clear data', err.message);
    }
  };

  // Initial check + periodic check
  useEffect(() => {
    checkDbSize();
    const interval = setInterval(checkDbSize, 60_000);
    return () => clearInterval(interval);
  }, []);

  // ---------------------------- CONTEXT VALUE ----------------------------
  return (
    <SettingsContext.Provider
      value={{
        language,
        setLanguage,
        formality,
        setFormality,
        darkMode,
        setDarkMode,
        notificationsEnabled,
        setNotificationsEnabled,
        apiUrls,
        setApiUrls,
        dbSize,
        saveDataToFile,
        importSavedData,
        clearData,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);

