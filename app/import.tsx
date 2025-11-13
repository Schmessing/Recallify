// app/import.tsx
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import {
  SQLiteProvider,
  useSQLiteContext,
  type SQLiteDatabase
} from 'expo-sqlite';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// Your app-specific imports
import { parseDocxToText } from '../components/parseDocx';
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

      let text = "";

      if (mimeType === "text/plain") {
        // Plain text
        const file = new File([await (await fetch(uri)).blob()], name);
        text = await file.text();
      }

      // PDF: convert to base64 via blob + FileReader
      else if (mimeType === "application/pdf") {
        const blob = await (await fetch(uri)).blob();

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]); // remove data: prefix
          reader.onerror = reject;
          reader.readAsDataURL(blob); // reads as "data:application/pdf;base64,...."
        });

        const extractBody = JSON.stringify({
          prompt: `Extract readable text from this PDF (base64-encoded). Return only the text.\n${base64}`,
        });

        const extractResp = await fetch(apiUrls.geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiUrls.geminiKey}`,
          },
          body: extractBody,
        });

        const extractData = await extractResp.json();
        text = (extractData?.text ?? "").trim();
      }

      // DOC: convert to base64 via blob + FileReader
      else if (mimeType === "application/msword") {
        const blob = await (await fetch(uri)).blob();

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const extractBody = JSON.stringify({
          prompt: `Extract readable text from this Microsoft Word (.doc) file (base64-encoded). Return only the text.\n${base64}`,
        });

        const extractResp = await fetch(apiUrls.geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiUrls.geminiKey}`,
          },
          body: extractBody,
        });

        const extractData = await extractResp.json();
        text = (extractData?.text ?? "").trim();
      }

      // DOCX: parse locally using blobToArrayBuffer
      else if (
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const blob = await (await fetch(uri)).blob();
        const arrayBuffer = await blobToArrayBuffer(blob); // helper function
        text = await parseDocxToText(arrayBuffer);
        text = text.trim();
      }

      else {
        Alert.alert('Unsupported file type');
        return;
      }

      // Generate Q&A
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
      } finally {
        await stmt.finalizeAsync();
      }

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
async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(blob);
  });
}