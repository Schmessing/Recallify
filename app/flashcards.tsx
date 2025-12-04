import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSettings } from '../constants/settingsProvider';
import { Colors, Spacing } from '../constants/theme';
// Assuming you have a helper function to get your DB instance, e.g., getDB
// import { getDB } from '../path/to/your/dbFile'; 
// If you are using the useSQLiteContext hook, you can use that instead.
import { useSQLiteContext } from 'expo-sqlite';

type Card = { id: string; question: string; answer: string };

export default function Flashcards() {
  const router = useRouter();
  const { darkMode } = useSettings();
  const theme = darkMode ? Colors.dark : Colors.light;
  const db = useSQLiteContext(); // Access the database instance

  const [cards, setCards] = useState<Card[]>([]); // Initialize with an empty array

  // Function to fetch data from the database
  const fetchFlashcards = async () => {
    try {
      // Use the database schema to select question and answer columns
      // The query below joins 'questions' and 'data' tables to get the question body and answer text.
      // Adjust the query based on your actual data structure and the table names (e.g., 'flashcard_set_questions', 'false_answers').
      const result = await db.getAllAsync<any>(`
        SELECT 
          q.id as id, 
          q.body as question, 
          d.answer as answer 
        FROM questions q
        JOIN data d ON q.data_id = d.id
      `);

      // Map the results to the Card type
      const fetchedCards: Card[] = result.map((row) => ({
        id: row.id.toString(), // Ensure ID is a string for keyExtractor
        question: row.question,
        answer: row.answer,
      }));

      setCards(fetchedCards); // Update the state with fetched data
    } catch (error) {
      console.error('Error fetching flashcards:', error);
    }
  };

  // Fetch data when the component mounts
  useEffect(() => {
    fetchFlashcards();
  }, []);

  const animMap = useRef<Record<string, Animated.Value>>({}).current;
  const flipped = useRef<Set<string>>(new Set());

  const getAnim = (id: string) => {
    if (!animMap[id]) animMap[id] = new Animated.Value(0);
    return animMap[id];
  };

  const flipCard = (id: string) => {
    const a = getAnim(id);
    const toValue = flipped.current.has(id) ? 0 : 1;
    Animated.timing(a, {
      toValue,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      if (toValue === 1) flipped.current.add(id);
      else flipped.current.delete(id);
    });
  };

  const renderItem = ({ item }: { item: Card }) => {
    const a = getAnim(item.id);

    const frontStyle = {
      transform: [
        { perspective: 1000 },
        { rotateY: a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) },
      ],
      backfaceVisibility: 'hidden' as const,
    };

    const backStyle = {
      transform: [
        { perspective: 1000 },
        { rotateY: a.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] }) },
      ],
      backfaceVisibility: 'hidden' as const,
    };

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => flipCard(item.id)}
        style={styles.cardTapArea}
      >
        <View style={styles.cardStack}>
          {/* FRONT = QUESTION */}
          <Animated.View
            style={[styles.card, { backgroundColor: theme.card }, frontStyle]}
          >
            <Text style={[styles.label, { color: theme.teal }]}>QUESTION</Text>
            <Text style={}>{item.question}</Text>
          </Animated.View>

          {/* BACK = ANSWER */}
          <Animated.View
            style={[styles.card, styles.cardBack, { backgroundColor: theme.card }, backStyle]}
          >
            <Text style={[styles.label, { color: theme.teal }]}>ANSWER</Text>
            <Text style={}>{item.answer}</Text>
          </Animated.View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={}>Your Flashcards</Text>
      <FlatList
        data={cards}
        renderItem={renderItem}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: 16 }}
      />
      <TouchableOpacity
        style={[styles.backButton, { backgroundColor: theme.teal }]}
        onPress={() => router.push('/home')}
      >
        <Text style={styles.backText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const CARD_H = 128;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: Spacing.md },
  cardTapArea: { width: '100%', marginBottom: Spacing.md },
  cardStack: { height: CARD_H },
  card: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: CARD_H,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'center',
  },
  cardBack: {
    // keep absolutely stacked; front/back won’t “bleed” due to backfaceVisibility
  },
  label: { fontSize: 12, fontWeight: '900', letterSpacing: 0.6, marginBottom: 6 },
  text: { fontSize: 16, fontWeight: '700' },
  backButton: { marginTop: 8, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  backText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
