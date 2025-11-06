// app/import.tsx
import * as DocumentPicker from 'expo-document-picker';
import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Button, Text, View } from 'react-native';
import { useSettings } from './settingsProvider';

export default function ImportScreen() {
  return (
    <SQLiteProvider databaseName="app.db" onInit={migrateDbIfNeeded}>
      <ImportContent />
    </SQLiteProvider>
  );
}

function ImportContent() {
  const db = useSQLiteContext();
  const { apiUrls } = useSettings(); // URLs and keys from settings
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if ('canceled' in result && result.canceled) return;

      const pickedFile = ('assets' in result && result.assets?.[0]) || result;
      const { uri, name, mimeType } = pickedFile;
      if (!uri) {
        Alert.alert('File selection failed');
        return;
      }

      setLoading(true);
      let text = '';

      // -------------------- OCR --------------------
      if (mimeType?.startsWith('image/')) {
        const formData = new FormData();
        formData.append("apikey", apiUrls.ocrKey); // use key from settings
        formData.append("language", "eng");
        formData.append("isOverlayRequired", "false");
        formData.append("file", { uri, type: mimeType, name } as any);

        const ocrRes = await fetch(apiUrls.ocrUrl, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "multipart/form-data" },
          body: formData,
        });
        const ocrData = await ocrRes.json();
        text = ocrData?.ParsedResults?.[0]?.ParsedText?.trim() || '';

      // -------------------- Whisper --------------------
      } else if (mimeType?.startsWith('audio/')) {
        const formData = new FormData();
        formData.append('audio', { uri, type: mimeType, name } as any);
        formData.append('apikey', apiUrls.whisperKey); // key from settings

        const res = await fetch(apiUrls.whisperUrl, { method: 'POST', body: formData });
        const data = await res.json();
        text = data.text || '';

      // -------------------- Plain Text --------------------
      } else if (mimeType === 'text/plain') {
        const fileResponse = await fetch(uri);
        const fileBlob = await fileResponse.blob();
        text = await new File([fileBlob], name).text();

      } else {
        Alert.alert('Unsupported file type');
        setLoading(false);
        return;
      }

      // -------------------- Gemini --------------------
      const geminiRes = await fetch(apiUrls.geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiUrls.geminiKey}` // key from settings
        },
        body: JSON.stringify({
          prompt: `Generate a question and answer for this content:\n${text}`,
        }),
      });
      const geminiData = await geminiRes.json();
      const generatedContent = geminiData.text || '';

      // -------------------- Save to SQLite --------------------
      const createdAt = new Date().toISOString();
      const topicId = 1;
      const stmt = await db.prepareAsync(
        `INSERT INTO data (name, size, body, topic_id, created_at) VALUES ($name, $size, $body, $topicId, $createdAt)`
      );

      let dataId = 0;
      try {
        const result = await stmt.executeAsync({
          $name: name,
          $size: text.length,
          $body: text,
          $topicId: topicId,
          $createdAt: createdAt,
        });
        dataId = result.lastInsertRowId; // ✅ this works
      } finally {
        await stmt.finalizeAsync();
      }

      const questionText = generatedContent.split('\n')[0] || 'Generated question';
      const answerText = generatedContent.split('\n')[1] || 'Generated answer';
      await db.runAsync(
        `INSERT INTO questions (data_id, question, answer) VALUES (?, ?, ?)`,
        dataId, questionText, answerText
      );

      Alert.alert('Import & API processing successful!');
    } catch (err) {
      console.error(err);
      Alert.alert('Error processing file', String(err));
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

// Database initialization
async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT
    );

    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      subject_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      size INTEGER,
      body TEXT,
      topic_id INTEGER,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data_id INTEGER,
      question TEXT,
      answer TEXT
    );

    CREATE TABLE IF NOT EXISTS false_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      questions_id INTEGER,
      false_answer TEXT,
      answer_level INTEGER
    );

    CREATE TABLE IF NOT EXISTS flashcard_set (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS flashcard_set_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER,
      flashcard_set_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS completed_quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER,
      result TEXT,
      answers_selected TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS quiz_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      questions_id INTEGER,
      quiz_id INTEGER
    );
  `);
  console.log('Database ready with full schema');
}
