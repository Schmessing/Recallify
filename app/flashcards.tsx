import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
    Animated,
    Easing,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type Card = { id: string; question: string; answer: string };

export default function Flashcards() {
  const router = useRouter();

  // demo data (swap later with SQLite/API)
  const [cards] = useState<Card[]>([
    { id: "1", question: "What is AI?", answer: "Artificial Intelligence" },
    { id: "2", question: "What does OCR stand for?", answer: "Optical Character Recognition" },
    { id: "3", question: "Define NLP.", answer: "Natural Language Processing" },
  ]);

  // keep an Animated.Value per card id
  const animMap = useRef<Record<string, Animated.Value>>({}).current;
  const flippedSet = useRef<Set<string>>(new Set()); // track flipped state per card

  const getAnim = (id: string) => {
    if (!animMap[id]) animMap[id] = new Animated.Value(0); // 0 = front, 1 = back
    return animMap[id];
  };

  const flipCard = (id: string) => {
    const anim = getAnim(id);
    const toValue = flippedSet.current.has(id) ? 0 : 1;
    Animated.timing(anim, {
      toValue,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      if (toValue === 1) flippedSet.current.add(id);
      else flippedSet.current.delete(id);
    });
  };

  const renderItem = ({ item }: { item: Card }) => {
    const anim = getAnim(item.id);

    const frontStyle = {
      transform: [
        { perspective: 1000 },
        {
          rotateY: anim.interpolate({
            inputRange: [0, 1],
            outputRange: ["0deg", "180deg"],
          }),
        },
      ],
    };

    const backStyle = {
      transform: [
        { perspective: 1000 },
        {
          rotateY: anim.interpolate({
            inputRange: [0, 1],
            outputRange: ["180deg", "360deg"],
          }),
        },
      ],
    };

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => flipCard(item.id)}
        style={styles.cardTapArea}
      >
        <View style={styles.cardShadow}>
          {/* front */}
          <Animated.View style={[styles.card, styles.cardFront, frontStyle]}>
            <Text style={styles.label}>Question</Text>
            <Text style={styles.question}>{item.question}</Text>
            <Text style={styles.hint}>Tap to flip</Text>
          </Animated.View>

          {/* back */}
          <Animated.View style={[styles.card, styles.cardBack, backStyle]}>
            <Text style={styles.label}>Answer</Text>
            <Text style={styles.answer}>{item.answer}</Text>
            <Text style={styles.hint}>Tap to flip back</Text>
          </Animated.View>
        </View>
      </TouchableOpacity>
    );
  };

  const keyExtractor = (item: Card) => item.id;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Flashcards</Text>

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={cards}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={{ textAlign: "center" }}>No cards available</Text>}
      />

      <TouchableOpacity style={styles.backButton} onPress={() => router.push("/home")}>
        <Text style={styles.backText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const CARD_HEIGHT = 130;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8F2", // light cream
    padding: 24,
    paddingTop: 100, // nudges header+cards down a bit
    alignItems: "stretch", // ensures full-width cards
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#222",
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  list: { alignSelf: "stretch" },
  listContent: {
    paddingBottom: 24,
    width: "100%",
  },
  cardTapArea: {
    width: "100%",
    marginBottom: 12,
  },
  cardShadow: {
    height: CARD_HEIGHT,
    position: "relative",
  },
  card: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: CARD_HEIGHT,
    borderRadius: 14,
    padding: 16,
    backfaceVisibility: "hidden",
    justifyContent: "center",
  },
  cardFront: {
    backgroundColor: "#DDF5F2",
  },
  cardBack: {
    backgroundColor: "#C7EBE6",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "#0F766E",
    marginBottom: 6,
  },
  question: {
    fontSize: 16,
    fontWeight: "700",
    color: "#00796B",
  },
  answer: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0B3D3B",
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: "#355f5c",
  },
  backButton: {
    marginTop: 16,
    backgroundColor: "#00BFA6",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  backText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
