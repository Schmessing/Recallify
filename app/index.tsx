import { StatusBar } from 'expo-status-bar';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ModalScreen from './modal';

export default function Home() {
  const handleViewDatasets = () => Alert.alert('View Datasets', 'Opening your datasets...');
  const handleViewGenerated = () => Alert.alert('Generated Content', 'Opening your generated content...');
  const handleImport = () => Alert.alert('Import', 'Starting import process...');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />

      <View style={styles.topBar}>
        <ModalScreen />
      </View>

      <View style={styles.container}>
        <View style={styles.importSection}>
          <Text style={styles.title}>Import</Text>
          <Text style={styles.subtitle}>Upload your study materials here.</Text>

          <TouchableOpacity style={styles.button} onPress={handleImport} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Import Data</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rightColumn}>
          <TouchableOpacity
            style={[styles.viewSection, styles.touchable]}
            onPress={handleViewDatasets}
            activeOpacity={0.8}
          >
            <Text style={styles.title}>View Datasets</Text>
            <ScrollView>
              <Text style={styles.textBody}>
                Tap to explore and manage your imported datasets. You can check summaries or delete old data.
              </Text>
            </ScrollView>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewSection, styles.touchable]}
            onPress={handleViewGenerated}
            activeOpacity={0.8}
          >
            <Text style={styles.title}>View Generated Content</Text>
            <ScrollView>
              <Text style={styles.textBody}>
                Tap to view your AI-generated flashcards, quizzes, and study summaries.
              </Text>
            </ScrollView>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
  },
  importSection: {
    flex: 3,
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 24,
    marginRight: 16,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  rightColumn: {
    flex: 2,
    justifyContent: 'space-between',
  },
  viewSection: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  touchable: {
    transform: [{ scale: 1 }],
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#CBD5E1',
    marginBottom: 20,
  },
  textBody: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
