import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSettings } from '../constants/settingsProvider';
import { Colors } from '../constants/theme';

export default function LandingScreen() {
  const router = useRouter();
  const { darkMode } = useSettings();

  const theme = darkMode ? Colors.dark : Colors.light;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Recallify</Text>
      <Text style={[styles.subtitle, { color: theme.text }]}>
        Study Smarter — One Screen at a Time
      </Text>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.teal }]}
        onPress={() => router.push('/home')}
      >
        <Text style={[styles.buttonText, { color: '#fff' }]}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 40, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, marginBottom: 40, textAlign: 'center', width: '80%' },
  button: { paddingVertical: 14, paddingHorizontal: 40, borderRadius: 14 },
  buttonText: { fontSize: 18, fontWeight: '600' },
});
