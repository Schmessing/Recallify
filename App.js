import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.card}>
        <Text style={styles.title}>Recallify</Text>
        <Text style={styles.subtitle}>Study smarter. One screen at a time.</Text>

        <TouchableOpacity style={styles.button} onPress={() => {}} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>

        <Text style={styles.version}>v0.0.1</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '88%',
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  logo: {
    fontSize: 56,
    marginBottom: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#000',
    textAlign: 'center',
  },
  button: {
    marginTop: 24,
    backgroundColor: '#a4f6ee',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  version: {
    marginTop: 18,
    color: '#64748B',
    fontSize: 12,
  },
});
