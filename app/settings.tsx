// app/settings.tsx
import React from 'react';
import { Alert, Button, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSettings } from '../app/settingsProvider'; // Adjust path if needed

export default function SettingsPage() {
  const {
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
    saveDataToFile,
    importSavedData,
    clearData,
  } = useSettings();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>App Settings</Text>

      {/* Language */}
      <View style={styles.row}>
        <Text style={styles.label}>Language:</Text>
        <Button title={language} onPress={() => setLanguage(language === 'en' ? 'es' : 'en')} />
      </View>

      {/* Formality */}
      <View style={styles.row}>
        <Text style={styles.label}>Formality (1-5):</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={formality.toString()}
          onChangeText={(v) => {
            const n = parseInt(v, 10);
            if (!isNaN(n) && n >= 1 && n <= 5) setFormality(n);
          }}
        />
      </View>

      {/* Dark Mode */}
      <View style={styles.row}>
        <Text style={styles.label}>Dark Mode:</Text>
        <Switch value={darkMode} onValueChange={setDarkMode} />
      </View>

      {/* Notifications */}
      <View style={styles.row}>
        <Text style={styles.label}>Notifications:</Text>
        <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} />
      </View>

      {/* API URLs */}
      <Text style={[styles.header, { marginTop: 20 }]}>API Settings</Text>

      {Object.keys(apiUrls).map((key) => (
        <View key={key} style={styles.row}>
          <Text style={styles.label}>{key}:</Text>
          <TextInput
            style={styles.input}
            value={apiUrls[key as keyof typeof apiUrls]}
            onChangeText={(v) =>
              setApiUrls((prev) => ({ ...prev, [key]: v }))
            }
          />
        </View>
      ))}

      {/* Storage Management */}
      <Text style={[styles.header, { marginTop: 20 }]}>Database</Text>
      <View style={styles.buttonRow}>
        <Button title="Save DB" onPress={saveDataToFile} />
        <Button title="Restore DB" onPress={importSavedData} />
        <Button
          title="Clear DB"
          color="red"
          onPress={() =>
            Alert.alert(
              'Confirm Clear',
              'Are you sure you want to clear the database?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'OK', onPress: clearData },
              ]
            )
          }
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  label: { flex: 1, fontSize: 16 },
  input: { flex: 2, borderWidth: 1, borderColor: '#ccc', padding: 5, borderRadius: 5 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
});
