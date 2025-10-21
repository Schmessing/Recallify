// app/import.tsx
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Button, Text, View } from 'react-native';

// Replace this with your actual OCR.Space API key
const OCR_API_KEY = "K84231978688957";

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
    console.log('Starting import...');
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    console.log('Document picker raw result:', result);

    if ('canceled' in result && result.canceled) {
      console.log('User cancelled file pick');
      Alert.alert('File selection cancelled');
      return;
    }

    const pickedFile = ('assets' in result && result.assets?.[0]) || result;
    const { uri, name, mimeType } = pickedFile;

    if (!uri) {
      console.log('No URI found in picked file:', pickedFile);
      Alert.alert('File selection failed. No file path detected.');
      return;
    }

    console.log('File selected:', { uri, name, mimeType });
    setLoading(true);

    let text = '';

    // -------------------- Pre-process file --------------------
    if (mimeType?.startsWith('image/')) {
      // Image -> OCR.Space
      const formData = new FormData();
      formData.append("apikey", OCR_API_KEY);
      formData.append("language", "eng");
      formData.append("isOverlayRequired", "false");
      formData.append("file", { uri, type: mimeType, name } as any);

      const ocrRes = await fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "multipart/form-data" },
        body: formData,
      });
      const ocrData = await ocrRes.json();
      text = ocrData?.ParsedResults?.[0]?.ParsedText?.trim() || '';
      console.log('OCR text extracted:', text.slice(0, 100));

    } else if (mimeType?.startsWith('audio/')) {
      // Audio -> backend (Whisper)
      const formData = new FormData();
      formData.append('audio', { uri, type: mimeType, name });
      const res = await fetch('whisper api address', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      text = data.text || '';
      console.log('Transcribed audio text:', text.slice(0, 100));

    } else if (mimeType === 'text/plain') {
      // Plain text
      text = await FileSystem.readAsStringAsync(uri);
      console.log('Plain text content preview:', text.slice(0, 100));

    } else {
      console.log('Unsupported file type:', mimeType);
      Alert.alert('Unsupported file type');
      setLoading(false);
      return;
    }

    // -------------------- Gemini call --------------------
    console.log('Sending text to Gemini API...');
    const geminiRes = await fetch('gemini api address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Generate a question and answer for this content:\n${text}`,
      }),
    });
    const geminiData = await geminiRes.json();
    const generatedContent = geminiData.text || '';
    console.log('Gemini output preview:', generatedContent.slice(0, 200));

    // -------------------- Save to SQLite --------------------
    const createdAt = new Date().toISOString();
    const topicId = 1; // Example: adjust topic assignment as needed
    const dataResult = await db.runAsync(
      `INSERT INTO data (name, size, body, topic_id, created_at) VALUES (?, ?, ?, ?, ?)`,
      name,
      text.length,
      text,
      topicId,
      createdAt
    );
    const dataId = dataResult.insertId;
    console.log('Data inserted with id:', dataId);

    // Save question & answer
    const questionText = generatedContent.split('\n')[0] || 'Generated question';
    const answerText = generatedContent.split('\n')[1] || 'Generated answer';
    await db.runAsync(
      `INSERT INTO questions (data_id, question, answer) VALUES (?, ?, ?)`,
      dataId,
      questionText,
      answerText
    );

    Alert.alert('Import & Gemini processing successful!');
  } catch (err) {
    console.error('Import error:', err);
    Alert.alert('Error processing file', String(err.message || err));
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
