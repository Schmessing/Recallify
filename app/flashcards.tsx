import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Animated, Easing, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import { useSettings } from './settingsProvider';

type Card = { id: string; question: string; answer: string };

export default function Flashcards() {
  const router = useRouter();
  const { darkMode } = useSettings();
  const theme = darkMode ? Colors.dark : Colors.light;

  const [cards] = useState<Card[]>([
    { id: '1', question: 'What is AI?', answer: 'Artificial Intelligence' },
    { id: '2', question: 'What does OCR stand for?', answer: 'Optical Character Recognition' },
    { id: '3', question: 'Define NLP.', answer: 'Natural Language Processing' },
  ]);

  const animMap = useRef<Record<string, Animated.Value>>({}).current;
  const flipped = useRef<Set<string>>(new Set());

  const getAnim = (id: string) => {
    if (!animMap[id]) animMap[id] = new Animated.Value(0); // 0 = SHOW QUESTION, 1 = SHOW ANSWER
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
            <Text style={[styles.text, { color: theme.text }]}>{item.question}</Text>
          </Animated.View>

          {/* BACK = ANSWER */}
          <Animated.View
            style={[styles.card, styles.cardBack, { backgroundColor: theme.card }, backStyle]}
          >
            <Text style={[styles.label, { color: theme.teal }]}>ANSWER</Text>
            <Text style={[styles.text, { color: theme.text }]}>{item.answer}</Text>
          </Animated.View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Your Flashcards</Text>
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
