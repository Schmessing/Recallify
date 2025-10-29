// app/index.tsx
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSizes, LineHeights, Spacing } from '../constants/theme';

export default function Landing() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />
        <View style={styles.card}>
          <Text style={styles.title}>Recallify</Text>
          <Text style={styles.subtitle}>Study smarter. One screen at a time.</Text>

          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={() => router.push('/home')}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>

          <Text style={styles.version}>v0.1.0</Text>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark.background, alignItems: 'center', justifyContent: 'center' },
  card: {
    width: '88%',
    backgroundColor: Colors.dark.card,
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowOpacity: 0.25,
    shadowColor: '#000',
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  title: { fontSize: FontSizes.xlarge, lineHeight: LineHeights.large, fontWeight: '800', color: '#F8FAFC', textAlign: 'center' },
  subtitle: { marginTop: Spacing.sm, fontSize: FontSizes.regular, lineHeight: LineHeights.medium, color: '#CBD5E1', textAlign: 'center' },
  button: {
    marginTop: Spacing.lg,
    width: '100%',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#6366F1',
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  version: { marginTop: Spacing.md, color: '#64748B', fontSize: 12 },
});

