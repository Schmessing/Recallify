import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSettings } from '../constants/settingsProvider';

type Subject = { id: number; name: string };
type Topic = { id: number; name: string; subject_id: number };
type FlashcardSet = { id: number; title: string; topic_id: number };
type Question = { id: string | number; question: string; answer: string; data_id: number };

const DBEditor = () => {
  const db = useSQLiteContext();
  const router = useRouter();
  const { theme } = useSettings(); // <- Use theme from settingsProvider

  // Navigation state
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedSet, setSelectedSet] = useState<FlashcardSet | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---------- Fetch helpers ----------
  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const rows = await db.getAllAsync<Subject>('SELECT * FROM subjects ORDER BY name ASC');
      setSubjects(rows);
    } catch (err) {
      setError('Failed to load subjects');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopics = async (subjectId: number) => {
    setLoading(true);
    try {
      const rows = await db.getAllAsync<Topic>(
        'SELECT * FROM topics WHERE subject_id = ? ORDER BY name ASC',
        [subjectId]
      );
      setTopics(rows);
    } catch (err) {
      setError('Failed to load topics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSets = async (topicId: number) => {
    setLoading(true);
    try {
      const rows = await db.getAllAsync<FlashcardSet>(
        'SELECT * FROM flashcard_set WHERE topic_id = ? ORDER BY title ASC',
        [topicId]
      );
      setSets(rows);
    } catch (err) {
      setError('Failed to load flashcard sets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async (setId: number) => {
    setLoading(true);
    try {
      const rows = await db.getAllAsync<Question>(
        `SELECT q.id, q.question, q.answer, q.data_id
         FROM questions q
         JOIN data d ON d.id = q.data_id
         JOIN flashcard_set fs ON fs.topic_id = d.topic_id
         WHERE fs.id = ?`,
        [setId]
      );
      setQuestions(rows);
    } catch (err) {
      setError('Failed to load questions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  // ---------- Update helper ----------
  const updateField = async (
    table: string,
    idField: string,
    id: number,
    column: string,
    value: string | number
  ) => {
    try {
      await db.runAsync(`UPDATE ${table} SET ${column} = ? WHERE ${idField} = ?`, [value, id]);
      // Refresh current list
      if (!selectedSubject) fetchSubjects();
      else if (selectedSubject && !selectedTopic) fetchTopics(selectedSubject.id);
      else if (selectedTopic && !selectedSet) fetchSets(selectedTopic.id);
      else if (selectedSet) fetchQuestions(selectedSet.id);
    } catch (err) {
      console.error(`Failed to update ${table}.${column}`, err);
    }
  };

  // ---------- Editable item component ----------
  const EditableItem = ({
    value,
    onSave,
    children,
  }: {
    value: string;
    onSave: (newVal: string) => void;
    children?: React.ReactNode;
  }) => {
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(value);

    return (
      <View style={[styles.item, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {editing ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
              value={text}
              onChangeText={setText}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.teal }]}
              onPress={() => {
                onSave(text);
                setEditing(false);
              }}
            >
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setEditing(true)}
            style={{ flexWrap: 'wrap', flexDirection: 'row', alignItems: 'center' }}
          >
            <Text style={[styles.nameText, { color: theme.text }]}>{text}</Text>
            {children}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.teal} />
        <Text style={{ color: theme.text }}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: 'red' }}>{error}</Text>
      </View>
    );
  }

  // ---------- Render navigation layers ----------
  const listContainerStyle = { paddingBottom: 20, backgroundColor: theme.background };

  // 1. Subjects
  if (!selectedSubject)
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <FlatList
          data={subjects}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={<Text style={[styles.title, { paddingTop: 20, color: theme.text }]}>Subjects</Text>}
          renderItem={({ item }) => (
            <EditableItem
              value={item.name}
              onSave={(newVal) => updateField('subjects', 'id', item.id, 'name', newVal)}
            >
              <TouchableOpacity
                onPress={() => {
                  setSelectedSubject(item);
                  fetchTopics(item.id);
                }}
                style={{ marginLeft: 25 }}
              >
                <Text style={{ color: theme.teal }}>Open</Text>
              </TouchableOpacity>
            </EditableItem>
          )}
          contentContainerStyle={listContainerStyle}
        />
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.teal }]}
          onPress={() => router.push('/home')}
        >
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );

  // 2. Topics
  if (selectedSubject && !selectedTopic)
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <FlatList
          data={topics}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={<Text style={[styles.title, { paddingTop: 20, color: theme.text }]}>{selectedSubject.name} — Topics</Text>}
          renderItem={({ item }) => (
            <EditableItem
              value={item.name}
              onSave={(newVal) => updateField('topics', 'id', item.id, 'name', newVal)}
            >
              <TouchableOpacity
                onPress={() => {
                  setSelectedTopic(item);
                  fetchSets(item.id);
                }}
                style={{ marginLeft: 25 }}
              >
                <Text style={{ color: theme.teal }}>Open</Text>
              </TouchableOpacity>
            </EditableItem>
          )}
          contentContainerStyle={listContainerStyle}
        />
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.teal }]}
          onPress={() => setSelectedSubject(null)}
        >
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );

  // 3. Flashcard Sets
  if (selectedTopic && !selectedSet)
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <FlatList
          data={sets}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={<Text style={[styles.title, { paddingTop: 20, color: theme.text }]}>{selectedTopic.name} — Sets</Text>}
          renderItem={({ item }) => (
            <EditableItem
              value={item.title}
              onSave={(newVal) => updateField('flashcard_set', 'id', item.id, 'title', newVal)}
            >
              <TouchableOpacity
                onPress={() => {
                  setSelectedSet(item);
                  fetchQuestions(item.id);
                }}
                style={{ marginLeft: 25 }}
              >
                <Text style={{ color: theme.teal }}>Open</Text>
              </TouchableOpacity>
            </EditableItem>
          )}
          contentContainerStyle={listContainerStyle}
        />
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.teal }]}
          onPress={() => setSelectedTopic(null)}
        >
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );

  // 4. Questions
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={questions}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={<Text style={[styles.title, { paddingTop: 20, color: theme.text }]}>{selectedSet?.title} — Questions</Text>}
        renderItem={({ item }) => (
          <View style={styles.questionItem}>
            <EditableItem
              value={item.question}
              onSave={(newVal) => updateField('questions', 'id', item.id, 'question', newVal)}
            />
            <EditableItem
              value={item.answer}
              onSave={(newVal) => updateField('questions', 'id', item.id, 'answer', newVal)}
            />
          </View>
        )}
        contentContainerStyle={listContainerStyle}
      />
      <TouchableOpacity
        style={[styles.backButton, { backgroundColor: theme.teal }]}
        onPress={() => setSelectedSet(null)}
      >
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  center: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  item: {
    padding: 15,
    borderBottomWidth: 1,
    borderRadius: 8,
    marginBottom: 5,
    flexWrap: 'wrap',
    borderWidth: 1,
  },
  nameText: { fontSize: 16, fontWeight: '600', flexWrap: 'wrap', flexShrink: 1 },
  input: {
    borderWidth: 1,
    padding: 8,
    borderRadius: 6,
    minWidth: 100,
  },
  saveButton: {
    marginLeft: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  saveText: { color: '#fff', fontWeight: 'bold' },
  backButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  backText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  questionItem: { marginBottom: 12 },
});

export default DBEditor;
