// seeTestData.ts
import { SQLiteDatabase } from 'expo-sqlite';

export default async function seedTestData(db: SQLiteDatabase) {
  try {
    // Clear tables
    await db.runAsync(`DELETE FROM flashcard_set_questions;`);
    await db.runAsync(`DELETE FROM questions;`);
    await db.runAsync(`DELETE FROM data;`);
    await db.runAsync(`DELETE FROM flashcard_set;`);
    await db.runAsync(`DELETE FROM topics;`);
    await db.runAsync(`DELETE FROM subjects;`);

    const subjects = ['Math', 'Science', 'History'];

    for (const subjName of subjects) {
      await db.runAsync(`INSERT INTO subjects (name) VALUES (?);`, [subjName]);
      const [subjectRow] = await db.getAllAsync<{ id: number; name: string }>(
        `SELECT * FROM subjects WHERE name = ? ORDER BY id DESC LIMIT 1;`,
        [subjName]
      );
      const subjectId = subjectRow.id;

      const topicNames = ['Intro', 'Advanced'];
      for (const topicName of topicNames) {
        await db.runAsync(`INSERT INTO topics (name, subject_id) VALUES (?, ?);`, [
          topicName,
          subjectId,
        ]);
        const [topicRow] = await db.getAllAsync<{ id: number; name: string }>(
          `SELECT * FROM topics WHERE name = ? AND subject_id = ? ORDER BY id DESC LIMIT 1;`,
          [topicName, subjectId]
        );
        const topicId = topicRow.id;

        const setTitle = `${subjName} ${topicName} Set`;
        const createdAt = new Date().toISOString();
        await db.runAsync(
          `INSERT INTO flashcard_set (title, topic_id, created_at) VALUES (?, ?, ?);`,
          [setTitle, topicId, createdAt]
        );

        const [setRow] = await db.getAllAsync<{ id: number }>(
          `SELECT * FROM flashcard_set WHERE title = ? ORDER BY id DESC LIMIT 1;`,
          [setTitle]
        );
        const setId = setRow.id;

        // Insert data
        await db.runAsync(`INSERT INTO data (topic_id, created_at) VALUES (?, ?);`, [
          topicId,
          createdAt,
        ]);
        const [dataRow] = await db.getAllAsync<{ id: number }>(
          `SELECT * FROM data WHERE topic_id = ? ORDER BY id DESC LIMIT 1;`,
          [topicId]
        );
        const dataId = dataRow.id;

        // Insert questions and link to set
        for (let i = 1; i <= 3; i++) {
          const qText = `${subjName} ${topicName} Q${i}`;
          const aText = `${subjName} ${topicName} Answer ${i}`;
          await db.runAsync(
            `INSERT INTO questions (question, answer, data_id) VALUES (?, ?, ?);`,
            [qText, aText, dataId]
          );

          const [qRow] = await db.getAllAsync<{ id: number }>(
            `SELECT * FROM questions WHERE question = ? AND data_id = ? ORDER BY id DESC LIMIT 1;`,
            [qText, dataId]
          );
          const questionId = qRow.id;

          await db.runAsync(
            `INSERT INTO flashcard_set_questions (flashcard_set_id, question_id) VALUES (?, ?);`,
            [setId, questionId]
          );
        }
      }
    }

    console.log('✅ Test data seeded!');
  } catch (err) {
    console.error('❌ Error seeding test data:', err);
  }
}
