import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { useSQLiteContext } from 'expo-sqlite';
import { useSettings } from '../constants/settingsProvider';
import { Colors, Spacing } from '../constants/theme';

type Card = { id: number; question: string; answer: string };
type Subject = { id: number; name: string };
type Topic = { id: number; name: string };
type FlashcardSet = { id: number; title: string };

export default function Flashcards() {
  const router = useRouter();
  const { darkMode } = useSettings();
  const theme = darkMode ? Colors.dark : Colors.light;

  const db = useSQLiteContext();

  // Navigation state
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [cards, setCards] = useState<Card[]>([]);

  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedSet, setSelectedSet] = useState<FlashcardSet | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // -----------------------------------------------------
  // LOAD SUBJECTS
  // -----------------------------------------------------
  const loadSubjects = async () => {
    try {
      setLoading(true);
      const rows = await db.getAllAsync<Subject>(
        `SELECT id, name FROM subjects ORDER BY name ASC`
      );
      setSubjects(rows);
      setLoading(false);
    } catch (err) {
      console.log(err);
      setError("Failed to load subjects.");
      setLoading(false);
    }
  };

  // -----------------------------------------------------
  // LOAD TOPICS FOR SUBJECT
  // -----------------------------------------------------
  const loadTopics = async (subjectId: number) => {
    try {
      setLoading(true);
      const rows = await db.getAllAsync<Topic>(
        `SELECT id, name FROM topics WHERE subject_id = ? ORDER BY name ASC`,
        [subjectId]
      );
      setTopics(rows);
      setLoading(false);
    } catch {
      setError("Failed to load topics.");
      setLoading(false);
    }
  };

  // -----------------------------------------------------
  // LOAD SETS FOR TOPIC  (FIXED QUERY)
  // -----------------------------------------------------
  const loadSets = async (topicId: number) => {
    try {
      setLoading(true);

      const rows = await db.getAllAsync<FlashcardSet>(
        `
        SELECT DISTINCT fs.id, fs.title
        FROM flashcard_set fs
        JOIN flashcard_set_questions fsq ON fsq.flashcard_set_id = fs.id
        JOIN questions q ON q.id = fsq.question_id
        JOIN data d ON d.id = q.data_id
        WHERE d.topic_id = ?
        ORDER BY fs.title ASC
      `,
        [topicId]
      );

      setSets(rows);
      setLoading(false);
    } catch (err) {
      console.log(err);
      setError("Failed to load flashcard sets.");
      setLoading(false);
    }
  };

  // -----------------------------------------------------
  // LOAD CARDS FOR FLASHCARD SET
  // -----------------------------------------------------
  const loadCards = async (setId: number) => {
    try {
      setLoading(true);
      const rows = await db.getAllAsync<Card>(
        `
        SELECT q.id, q.question, q.answer
        FROM flashcard_set_questions fsq
        JOIN questions q ON q.id = fsq.question_id
        WHERE fsq.flashcard_set_id = ?
      `,
        [setId]
      );
      setCards(rows);
      setLoading(false);
    } catch {
      setError("Failed to load cards.");
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  // -----------------------------------------------------
  // CARD ANIMATION
  // -----------------------------------------------------
  const animMap = useRef<Record<string, Animated.Value>>({}).current;
  const flipped = useRef<Set<string>>(new Set());

  const getAnim = (id: number) => {
    const key = String(id);
    if (!animMap[key]) animMap[key] = new Animated.Value(0);
    return animMap[key];
  };

  const flipCard = (id: number) => {
    const key = String(id);
    const a = getAnim(id);
    const toVal = flipped.current.has(key) ? 0 : 1;

    Animated.timing(a, {
      toValue: toVal,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start(() => {
      if (toVal === 1) flipped.current.add(key);
      else flipped.current.delete(key);
    });
  };

  const renderCard = ({ item }: { item: Card }) => {
    const a = getAnim(item.id);

    const frontStyle = {
      transform: [
        { perspective: 1000 },
        { rotateY: a.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] }) }
      ],
      backfaceVisibility: "hidden" as const
    };

    const backStyle = {
      transform: [
        { perspective: 1000 },
        { rotateY: a.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] }) }
      ],
      backfaceVisibility: "hidden" as const
    };

    return (
      <TouchableOpacity onPress={() => flipCard(item.id)} style={styles.cardTapArea}>
        <View style={styles.cardStack}>
          <Animated.View style={[styles.card, { backgroundColor: theme.card }, frontStyle]}>
            <Text style={[styles.label, { color: theme.teal }]}>QUESTION</Text>
            <Text style={[styles.text, { color: theme.teal }]}>{item.question}</Text>
          </Animated.View>

          <Animated.View style={[styles.card, styles.cardBack, { backgroundColor: theme.card }, backStyle]}>
            <Text style={[styles.label, { color: theme.teal }]}>ANSWER</Text>
            <Text style={[styles.text, { color: theme.teal }]}>{item.answer}</Text>
          </Animated.View>
        </View>
      </TouchableOpacity>
    );
  };

  // -----------------------------------------------------
  // RENDERING LAYERS (Folders)
  // -----------------------------------------------------

  if (loading)
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.teal} />
        <Text style={{ color: theme.text, marginTop: 10 }}>Loading...</Text>
      </View>
    );

  if (error)
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: "red" }}>{error}</Text>
      </View>
    );

  //------------------------------------
  // LEVEL 1 — SUBJECTS (folders)
  //------------------------------------
  if (!selectedSubject)
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.label, { fontSize: 22, color: theme.teal, padding: 20 }]}>📁 Subjects</Text>

        <FlatList
          data={subjects}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.subjectButton, { backgroundColor: theme.card }]}
              onPress={() => {
                setSelectedSubject(item);
                loadTopics(item.id);
              }}>
              <Text style={[styles.subjectText, { color: theme.text }]}>📁 {item.name}</Text>
            </TouchableOpacity>
          )}
        />
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.teal }]}
          onPress={() => router.push('/home')}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>
    );

  //------------------------------------
  // LEVEL 2 — TOPICS
  //------------------------------------
  if (selectedSubject && !selectedTopic)
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.label, { fontSize: 22, color: theme.teal, padding: 20 }]}>
          📁 {selectedSubject.name} — Topics
        </Text>

        <FlatList
          data={topics}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.subjectButton, { backgroundColor: theme.card }]}
              onPress={() => {
                setSelectedTopic(item);
                loadSets(item.id);
              }}>
              <Text style={[styles.subjectText, { color: theme.text }]}>📁 {item.name}</Text>
            </TouchableOpacity>
          )}
        />

        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.teal }]}
          onPress={() => {
            setSelectedSubject(null);
            setTopics([]);
          }}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>
    );

  //------------------------------------
  // LEVEL 3 — FLASHCARD SETS
  //------------------------------------
  if (selectedTopic && !selectedSet)
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.label, { fontSize: 22, color: theme.teal, padding: 20 }]}>
          📁 {selectedTopic.name} — Flashcard Sets
        </Text>

        <FlatList
          data={sets}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.subjectButton, { backgroundColor: theme.card }]}
              onPress={() => {
                setSelectedSet(item);
                loadCards(item.id);
              }}>
              <Text style={[styles.subjectText, { color: theme.text }]}>🗂️ {item.title}</Text>
            </TouchableOpacity>
          )}
        />

        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.teal }]}
          onPress={() => {
            setSelectedTopic(null);
            setSets([]);
          }}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>
    );

  //------------------------------------
  // LEVEL 4 — FLASHCARDS VIEW
  //------------------------------------
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.label, { fontSize: 22, color: theme.teal, padding: 20 }]}>
        {selectedSet?.title} — Flashcards
      </Text>

      <FlatList
        data={cards}
        renderItem={renderCard}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ paddingBottom: 16 }}
      />

      <TouchableOpacity
        style={[styles.backButton, { backgroundColor: theme.teal }]}
        onPress={() => {
          setSelectedSet(null);
          setCards([]);
        }}>
        <Text style={styles.backText}>Back to Sets</Text>
      </TouchableOpacity>
    </View>
  );
}

const CARD_H = 128;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  center: { justifyContent: "center", alignItems: "center" },

  subjectButton: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12
  },
  subjectText: {
    fontSize: 18,
    fontWeight: "700"
  },

  // cards
  cardTapArea: { width: "100%", marginBottom: Spacing.md },
  cardStack: { height: CARD_H },
  card: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: CARD_H,
    borderRadius: 16,
    padding: 16,
    justifyContent: "center"
  },
  cardBack: {},

  label: { fontSize: 12, fontWeight: "900", marginBottom: 6 },
  text: { fontSize: 16, fontWeight: "700" },

  backButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center"
  },
  backText: { color: "#fff", fontSize: 16, fontWeight: "700" }
});
