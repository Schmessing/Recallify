// app/import.tsx
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Button, Text, View } from 'react-native';

// Main screen wrapped in the provider
export default function ImportScreen() {
  return (
    <SQLiteProvider databaseName="app.db" onInit={migrateDbIfNeeded}>
      <ImportContent />
    </SQLiteProvider>
  );
}

function ImportContent() {
  const db = useSQLiteContext();
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.type !== 'success') return;

      const { uri, name, mimeType } = result as DocumentPicker.DocumentPickerSuccessResult;
      setLoading(true);

      let text = '';

      if (mimeType?.startsWith('image/')) {
        const formData = new FormData();
        formData.append('image', { uri, type: mimeType, name });
        const res = await fetch('http://YOUR_BACKEND_IP:5000/api/ocr', { method: 'POST', body: formData });
        const data = await res.json();
        text = data.text;
      } else if (mimeType?.startsWith('audio/')) {
        const formData = new FormData();
        formData.append('audio', { uri, type: mimeType, name });
        const res = await fetch('http://YOUR_BACKEND_IP:5000/api/transcribe', { method: 'POST', body: formData });
        const data = await res.json();
        text = data.text;
      } else if (mimeType === 'text/plain') {
        text = await FileSystem.readAsStringAsync(uri);
      } else {
        Alert.alert('Unsupported file type');
        setLoading(false);
        return;
      }

      // Send to backend for processing / generating flashcards
      const geminiRes = await fetch('http://YOUR_BACKEND_IP:5000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `Process this content:\n${text}` }),
      });
      const geminiData = await geminiRes.json();
      const finalText = geminiData.text;

      // ✅ Save to SQLite using the async API
      await db.runAsync(
        'INSERT INTO entries (originalText, finalText, type) VALUES (?, ?, ?)',
        text,
        finalText,
        mimeType?.startsWith('image/')
          ? 'image'
          : mimeType?.startsWith('audio/')
          ? 'audio'
          : 'text'
      );

      Alert.alert('Import successful!');
    } catch (err) {
      console.error('Import error:', err);
      Alert.alert('Error processing file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 20 }}>Import a file to process</Text>
      <Button title="Import File" onPress={handleImport} />
      {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}
    </View>
  );
}

// ✅ Database initialization
async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      originalText TEXT,
      finalText TEXT,
      type TEXT
    );
  `);
}
