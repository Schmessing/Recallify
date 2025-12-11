// RootLayout.tsx
import { Stack } from 'expo-router';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import SettingsProvider from '../constants/settingsProvider';
import seedTestData from './seedTestData';

export default function RootLayout() {
  const createDbIfNeeded = async (db: SQLiteDatabase) => {
    // --- Ensure journal mode ---
    await db.execAsync(`PRAGMA journal_mode = WAL;`);

    // --- Create tables if not exist ---
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        subject_id INTEGER NOT NULL,
        FOREIGN KEY (subject_id) REFERENCES subjects(id)
      );
      
      CREATE TABLE IF NOT EXISTS data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        size INTEGER,
        body TEXT,
        topic_id INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (topic_id) REFERENCES topics(id)
      );
      
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data_id INTEGER NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        FOREIGN KEY (data_id) REFERENCES data(id)
      );
      
      CREATE TABLE IF NOT EXISTS false_answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        questions_id INTEGER NOT NULL,
        false_answer TEXT NOT NULL,
        answer_level INTEGER,
        FOREIGN KEY (questions_id) REFERENCES questions(id)
      );
      
      CREATE TABLE IF NOT EXISTS flashcard_set (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS flashcard_set_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id INTEGER NOT NULL,
        flashcard_set_id INTEGER NOT NULL,
        FOREIGN KEY (question_id) REFERENCES questions(id),
        FOREIGN KEY (flashcard_set_id) REFERENCES flashcard_set(id)
      );
    `);
      try {
        await db.execAsync(`ALTER TABLE flashcard_set ADD COLUMN topic_id INTEGER;`);
        console.log("✅ Migrated flashcard_set: topic_id added.");
      } catch {
        // Column probably already exists
      }
    // --- Seed test data ---
    await seedTestData(db);
  };


  return (
    <SQLiteProvider databaseName="app.db" onInit={createDbIfNeeded}>
      <SettingsProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SettingsProvider>
    </SQLiteProvider>
  );
}


