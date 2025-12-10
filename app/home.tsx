// app/home.tsx
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSettings } from '../constants/settingsProvider';
import { Colors, Spacing } from '../constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { darkMode } = useSettings();
  const theme = darkMode ? Colors.dark : Colors.light;

  const Card = ({ title, body, onPress }: { title: string; body: string; onPress: () => void }) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: theme.card }]} onPress={onPress} activeOpacity={0.85}>
      <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
      <Text style={{ color: theme.text, opacity: 0.9 }}>{body}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.header, { color: theme.text }]}>Home</Text>
      <View style={{ width: '100%', gap: Spacing.md }}>
        <Card title="Import Data" body="Upload and process your files." onPress={() => router.push('/import')} />
        <Card title="View Datasets" body="Explore and manage imported datasets." onPress={() => router.push('/viewdb')} />
        <Card title="View Generated Flashcards" body="Study and review your AI-generated flashcards." onPress={() => router.push('/flashcards')} />
        <Card title="View Generated Quizzes" body="Study with your AI-generated quizzes." onPress={() => router.push('/quiz')} />
        <Card title="Settings" body="Customize your preferences." onPress={() => router.push('/settings')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.lg, gap: Spacing.md, flexGrow: 1 },
  header: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  card: { borderRadius: 16, padding: Spacing.lg, marginHorizontal: 2, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
});
