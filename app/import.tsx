// app/import.tsx
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Spacing } from '../constants/theme';
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
  const router = useRouter();
  const { apiUrls, darkMode } = useSettings();
  const theme = darkMode ? Colors.dark : Colors.light;

  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert('File selection failed');
        return;
      }

      const { uri, name, mimeType } = asset;
      setLoading(true);

      let text = '';

      if (mimeType?.startsWith('image/')) {
        const fd = new FormData();
        fd.append('apikey', apiUrls.ocrKey);
        fd.append('language', 'eng');
        fd.append('isOverlayRequired', 'false');
        fd.append('file', { uri, type: mimeType, name } as any);
        const resp = await fetch(apiUrls.ocrUrl, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'multipart/form-data' },
          body: fd,
        });
        const data = await resp.json();
        text = data?.ParsedResults?.[0]?.ParsedText?.trim() ?? '';
      } else if (mimeType?.startsWith('audio/')) {
        const fd = new FormData();
        fd.append('audio', { uri, type: mimeType, name } as any);
        fd.append('apikey', apiUrls.whisperKey);
        const resp = await fetch(apiUrls.whisperUrl, { method: 'POST', body: fd });
        const data = await resp.json();
        text = data?.text ?? '';
      } else if (mimeType === 'text/plain') {
        const fileResp = await fetch(uri);
        const blob = await fileResp.blob();
        text = await new File([blob], name).text();
      } else {
        Alert.alert('Unsupported file type');
        return;
      }

      const gemBody = JSON.stringify({
        prompt: `Generate one question and its answer for this content:\n${text}`,
      });
      const gem = await fetch(apiUrls.geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiUrls.geminiKey}` },
        body: gemBody,
      });
      const gdata = await gem.json();
      const generated = gdata?.text ?? '';

      const createdAt = new Date().toISOString();
      const topicId = 1;
      const stmt = await db.prepareAsync(
        `INSERT INTO data (name, size, body, topic_id, created_at) VALUES ($name, $size, $body, $topicId, $createdAt)`
      );
      let dataId = 0;
      try {
        const res = await stmt.executeAsync({
          $name: name, $size: text.length, $body: text, $topicId: topicId, $createdAt: createdAt,
        });
        dataId = res.lastInsertRowId;
      } finally { await stmt.finalizeAsync(); }

      const [q, a] = generated.split('\n');
      await db.runAsync(
        `INSERT INTO questions (data_id, question, answer) VALUES (?, ?, ?)`,
        dataId, q || 'Generated question', a || 'Generated answer'
      );

      Alert.alert('Import complete!');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: Spacing.lg, backgroundColor: theme.background }}>
      <Text style={{ fontSize: 26, fontWeight: '800', color: theme.text, marginBottom: Spacing.md }}>Import</Text>
      <Text style={{ color: theme.text, opacity: 0.9, marginBottom: Spacing.lg }}>
        Upload your study materials here.
      </Text>

      <TouchableOpacity onPress={handleImport}
        style={{ backgroundColor: theme.teal, paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Import File</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/home')}
        style={{ marginTop: Spacing.md, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: theme.teal }}>
        <Text style={{ color: theme.teal, fontWeight: '700' }}>Back to Home</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" style={{ marginTop: Spacing.lg }} />}
    </View>
  );
}

async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS subjects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);
    CREATE TABLE IF NOT EXISTS topics (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, subject_id INTEGER);
    CREATE TABLE IF NOT EXISTS data (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, size INTEGER, body TEXT, topic_id INTEGER, created_at TEXT);
    CREATE TABLE IF NOT EXISTS questions (id INTEGER PRIMARY KEY AUTOINCREMENT, data_id INTEGER, question TEXT, answer TEXT);
    CREATE TABLE IF NOT EXISTS false_answers (id INTEGER PRIMARY KEY AUTOINCREMENT, questions_id INTEGER, false_answer TEXT, answer_level INTEGER);
    CREATE TABLE IF NOT EXISTS flashcard_set (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS flashcard_set_questions (id INTEGER PRIMARY KEY AUTOINCREMENT, question_id INTEGER, flashcard_set_id INTEGER);
    CREATE TABLE IF NOT EXISTS quizzes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS completed_quizzes (id INTEGER PRIMARY KEY AUTOINCREMENT, quiz_id INTEGER, result TEXT, answers_selected TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS quiz_questions (id INTEGER PRIMARY KEY AUTOINCREMENT, questions_id INTEGER, quiz_id INTEGER);
  `);
}
