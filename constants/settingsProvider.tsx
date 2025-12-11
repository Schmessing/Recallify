// app/settingsProvider.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { File } from 'expo-file-system'; // This import seems unused in the snippet
import { useSQLiteContext } from 'expo-sqlite';
import React, {
  createContext,
  useCallback,
  useContext, useEffect,
  useMemo, useState
} from 'react';
import { Alert } from 'react-native';
import { Colors } from './theme';

// ---------- types ----------
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

// ---------- context ----------
const SettingsContext = createContext<SettingsContextType | null>(null);

const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};

// ---------- provider ----------
function SettingsProvider({ children }: { children: React.ReactNode }) {
  const defaultApiUrls: ApiUrls = {
    ocrUrl: 'https://api.ocr.space/parse/image',
    ocrKey: 'K84996160788957',
    assemblyAIKey: '9d5f8494428f49b6aabedf950ad49d21',
    googletranscriptUrl: 'https://speech.googleapis.com/v1/speech:recognize',
    googletranscriptKey: 'AIzaSyBz3uzo8P4eH6tw2ZEPHqtfZVv3IJkgPi8',
    geminiKey: 'AIzaSyDeNJYNEfMHGWsDtMlVntzVZrgLgVynFrg',
  };

  const [loadingSettings, setLoadingSettings] = useState(true);
  const [language, setLanguage] = useState('en');
  const [formality, setFormality] = useState<number>(3);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  // Initialize state using the default values
  const [apiUrls, setApiUrlsState] = useState<ApiUrls>(defaultApiUrls);

  // FIX IS HERE: Create a stable wrapper function that merges partial updates and persists data
  const setApiUrls = useCallback((partialUrls: Partial<ApiUrls>) => {
    setApiUrlsState(prevUrls => {
      const newUrls = {
        ...prevUrls,
        ...partialUrls,
      };
      // Persist the *entire* new object to AsyncStorage immediately
      AsyncStorage.setItem('apiUrls', JSON.stringify(newUrls)).catch(console.error);
      return newUrls;
    });
  }, []);
  
  // Also create stable setters for other settings that need persistence
  const setAndPersistLanguage = useCallback((v: string) => {
    setLanguage(v);
    AsyncStorage.setItem('language', v).catch(console.error);
  }, []);

  const setAndPersistDarkMode = useCallback((v: boolean) => {
    setDarkMode(v);
    AsyncStorage.setItem('darkMode', JSON.stringify(v)).catch(console.error);
  }, []);


  const theme = useMemo(() => (darkMode ? Colors.dark : Colors.light), [darkMode]);

  // Placeholder implementations for DB functions:
  const db = useSQLiteContext();
  const [dbSize, setDbSize] = useState(0);
  const saveDB = async () => { Alert.alert('Save DB function not implemented'); };
  const restoreDB = async () => { Alert.alert('Restore DB function not implemented'); };
  const clearDB = async () => { Alert.alert('Clear DB function not implemented'); };

  // Load settings effect
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load apiUrls
        const storedApiUrls = await AsyncStorage.getItem('apiUrls');
        if (storedApiUrls) {
          setApiUrlsState(JSON.parse(storedApiUrls));
        }

        // Load language
        const storedLanguage = await AsyncStorage.getItem('language');
        if (storedLanguage) {
          setLanguage(storedLanguage);
        }

        // Load darkMode
        const storedDarkMode = await AsyncStorage.getItem('darkMode');
        if (storedDarkMode !== null) {
          setDarkMode(JSON.parse(storedDarkMode));
        }

      } catch (e) {
        console.error("Failed to load settings", e);
      } finally {
        setLoadingSettings(false);
      }
    };
    loadSettings();
  }, []); // Empty dependency array means this runs once on mount

  const value = useMemo(() => ({
    language, setLanguage: setAndPersistLanguage,
    formality, setFormality, // Formality doesn't have persistence logic yet, assuming it's less critical for this fix
    darkMode, setDarkMode: setAndPersistDarkMode,
    apiUrls, setApiUrls, // Use the new wrapper function here
    theme,
    dbSize,
    saveDB,
    restoreDB,
    clearDB,
  }), [
    language, setAndPersistLanguage, 
    formality, 
    darkMode, setAndPersistDarkMode, 
    apiUrls, setApiUrls, 
    theme, dbSize
  ]);

  if (loadingSettings) {
    // Return a loading indicator here if needed
    return null; 
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export { SettingsProvider, useSettings };

