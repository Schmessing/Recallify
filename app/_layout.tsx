import { Stack } from 'expo-router';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import SettingsProvider from '../constants/settingsProvider';

export default function RootLayout() {
  const createDbIfNeeded = async (db: SQLiteDatabase) => {
  await db.execAsync(
    `
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

  return (
    <SQLiteProvider databaseName="app.db" onInit={createDbIfNeeded}>
      <SettingsProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SettingsProvider>
    </SQLiteProvider>
  );
}


