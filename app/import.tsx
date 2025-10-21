// app/import.tsx
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, Platform, Text, View } from 'react-native';

let db: any;

export default function ImportScreen() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      // Only load SQLite on mobile
      const loadSQLite = async () => {
        const SQLite = await import('expo-sqlite');
        db = SQLite.openDatabase('app.db');

        db.transaction((tx: any) => {
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS entries (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              originalText TEXT,
              finalText TEXT,
              type TEXT
            );`
          );
        });
      };

      loadSQLite();
    }
  }, []);

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.type !== 'success') return;
      const { uri, name, mimeType } = result as DocumentPicker.DocumentPickerSuccessResult;

      setLoading(true);
      let text = '';

      if (mimeType?.startsWith('image/')) {
        // send image to API
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

      // Send to API for processing / generating flashcards
      const geminiRes = await fetch('http://YOUR_BACKEND_IP:5000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `Process this content:\n${text}` }),
      });
      const geminiData = await geminiRes.json();
      const finalText = geminiData.text;

      if (Platform.OS !== 'web' && db) {
        // Only save to SQLite on mobile
        db.transaction((tx: any) => {
          tx.executeSql(
            'INSERT INTO entries (originalText, finalText, type) VALUES (?, ?, ?)',
            [
              text,
              finalText,
              mimeType?.startsWith('image/')
                ? 'image'
                : mimeType?.startsWith('audio/')
                ? 'audio'
                : 'text',
            ]
          );
        });
      }

      Alert.alert('Import successful!');
    } catch (err) {
      console.error(err);
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
