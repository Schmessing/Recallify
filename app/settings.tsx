// app/settings.tsx
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSettings } from '../constants/settingsProvider';
import { FontSizes, Spacing } from '../constants/theme';

// Define type for API URLs
interface ApiUrls {
  ocrUrl: string;
  ocrKey: string;
  googletranscriptUrl: string;
  googletranscriptKey: string;
  geminiKey: string;
}

export default function SettingsScreen() {
  const router = useRouter();
  const {
    language, setLanguage,
    formality, setFormality,
    darkMode, setDarkMode,
    apiUrls, setApiUrls, theme,
    saveDB, restoreDB, clearDB
  } = useSettings();

  return (
    <ScrollView contentContainerStyle={[styles.scroll, { backgroundColor: theme.background }]}>
      {/* Dark mode */}
      <View style={styles.row}>
        <Text style={[styles.title, { color: theme.text }]}>Dark Mode</Text>
        <Switch value={darkMode} onValueChange={setDarkMode} />
      </View>

      {/* Language + Formality */}
      <Text style={[styles.section, { color: theme.text }]}>Language</Text>
      <TextInput
        value={language}
        onChangeText={setLanguage}
        style={[styles.input, { borderColor: theme.teal, color: theme.text }]}
        placeholder="en"
        placeholderTextColor={theme.text + '88'}
      />


      {/* API settings */}
      <Text style={[styles.header, { color: theme.text }]}>API Settings</Text>
      {([
        ['assemblyAIKey', 'AssemblyAI Key'],
        ['geminiKey', 'Gemini Key'],
      ] as const).map(([key, label]) => (
        <View key={key} style={{ marginBottom: Spacing.sm }}>
          <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
          <TextInput
            value={apiUrls[key]}
            onChangeText={(v) =>
              setApiUrls(prev => ({ ...prev, [key]: v } as ApiUrls))
            }
            autoCapitalize="none"
            style={[styles.input, { borderColor: theme.teal, color: theme.text }]}
            placeholder={label}
            placeholderTextColor={theme.text + '88'}
          />
        </View>
      ))}

      {/* DB buttons */}
      {/* <Text style={[styles.header, { color: theme.text, marginTop: Spacing.lg }]}>Database</Text>
      <TouchableOpacity style={[styles.btn, { backgroundColor: theme.teal }]} onPress={saveDB}>
        <Text style={styles.btnText}>Save DB</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, { backgroundColor: theme.teal }]} onPress={restoreDB}>
        <Text style={styles.btnText}>Restore DB</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btnOutline, { borderColor: theme.teal }]} onPress={clearDB}>
        <Text style={[styles.btnText, { color: theme.teal }]}>Clear DB</Text>
      </TouchableOpacity> */}

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: theme.teal, marginTop: Spacing.lg }]}
        onPress={() => router.push('/home')}
      >
        <Text style={styles.btnText}>Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: Spacing.lg, gap: Spacing.sm },
  title: { fontSize: FontSizes.large, fontWeight: '800' },
  header: { fontSize: FontSizes.large, fontWeight: '800', marginBottom: Spacing.sm },
  section: { fontSize: FontSizes.medium, fontWeight: '700', marginTop: Spacing.md, marginBottom: 6 },
  label: { fontWeight: '700', marginBottom: 6 },
  input: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  btn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: Spacing.sm },
  btnText: { color: '#fff', fontWeight: '700' },
  btnOutline: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 2 },
});
