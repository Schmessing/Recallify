import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// Import the SQLite hook
import { useSQLiteContext } from 'expo-sqlite';
import { useSettings } from '../constants/settingsProvider';
import { Colors, Spacing } from '../constants/theme';

// Update the type definition to match the 'questions' table schema from viewdb.tsx
// Using 'id: number' might be better if your DB uses numeric IDs, but string works for keyExtractor
type Card = { id: number; question: string; answer: string };

export default function Flashcards() {
  const router = useRouter();
  const { darkMode } = useSettings();
  const theme = darkMode ? Colors.dark : Colors.light;
  // Access the database instance
  const db = useSQLiteContext(); 

  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch data from the SQLite database
  const fetchFlashcardsFromDB = async () => {
    try {
      // Use db.getAllAsync to fetch all rows from the questions table
      const questionsResult = await db.getAllAsync<Card>('SELECT id, question, answer FROM questions');
      setCards(questionsResult);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching flashcards from DB:', err);
      setError('Failed to load flashcards from database.');
      setIsLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchFlashcardsFromDB();
  }, []); // Empty dependency array ensures it runs once on mount

  // --- (The rest of your existing animation logic and renderItem function goes here) ---
  // The animation logic and rendering part does not need changes.

  const animMap = useRef<Record<string, Animated.Value>>({}).current;
  const flipped = useRef<Set<string>>(new Set());

  const getAnim = (id: string | number) => {
    // Ensure the key is a string for JS object keys
    const idStr = String(id);
    if (!animMap[idStr]) animMap[idStr] = new Animated.Value(0);
    return animMap[idStr];
  };

  const flipCard = (id: string | number) => {
    const idStr = String(id);
    const a = getAnim(idStr);
    const toValue = flipped.current.has(idStr) ? 0 : 1;
    Animated.timing(a, {
      toValue,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true, // Typo fix: useNativeDriver
    }).start(() => {
      if (toValue === 1) flipped.current.add(idStr);
      else flipped.current.delete(idStr);
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
            <Text style={[styles.text, { color: theme.teal }]}>{item.question}</Text>
          </Animated.View>

          {/* BACK = ANSWER */}
          <Animated.View
            style={[styles.card, styles.cardBack, { backgroundColor: theme.card }, backStyle]}
          >
            <Text style={[styles.label, { color: theme.teal }]}>ANSWER</Text>
            <Text style={[styles.text, { color: theme.teal }]}>{item.answer}</Text>
          </Animated.View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.teal} />
        <Text style={{ color: theme.text, marginTop: 10 }}>Loading flashcards...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }]}>
        <Text style={{ color: 'red' }}>{error}</Text>
      </View>
    );
  }


  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.label, { color: theme.teal }]}>Your Flashcards</Text>
      <FlatList
          data={cards}
          renderItem={renderItem}
          keyExtractor={(i) => String(i.id)} // Use String() to ensure keyExtractor works with number or string IDs
          contentContainerStyle={{ paddingBottom: 16 }}
          ListEmptyComponent={<Text style={{color: theme.text, textAlign: 'center', marginTop: 20}}>No flashcards found in the database.</Text>}
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
  title: { fontSize: 26, fontWeight: '800', marginBottom: Spacing.md }, // Added title style from original code
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

