import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSizes, LineHeights, Spacing } from '../constants/theme';
import ModalScreen from './modal';

export default function Home() {
  const { width } = useWindowDimensions();
  const isMobile = width < 450;

  const handleImport = () => alert('Starting import process...');
  const handleViewDatasets = () => alert('Opening your datasets...');
  const handleViewGenerated = () => alert('Opening your generated content...');

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />

        <View style={styles.topBar}>
          <ModalScreen />
        </View>

        <View style={[styles.container, { flexDirection: isMobile ? 'column' : 'row' }]}>
          {/* Import Section */}
          <View style={[styles.importSection, { marginRight: isMobile ? 0 : Spacing.md, marginBottom: isMobile ? Spacing.md : 0 }]}>
            <Text style={[styles.title, { fontSize: FontSizes.xlarge, lineHeight: LineHeights.large }]}>Import</Text>
            <Text style={[styles.subtitle, { fontSize: FontSizes.regular, lineHeight: LineHeights.medium }]}>
              Upload your study materials here.
            </Text>
            <TouchableOpacity style={styles.button} onPress={handleImport}>
              <Text style={[styles.buttonText, { fontSize: FontSizes.medium, lineHeight: LineHeights.medium }]}>
                Import Data
              </Text>
            </TouchableOpacity>
          </View>

          {/* Right Section */}
          <View style={styles.rightColumn}>
            <TouchableOpacity style={styles.viewSection} onPress={handleViewDatasets}>
              <Text style={[styles.title, { fontSize: FontSizes.large, lineHeight: LineHeights.large }]}>View Datasets</Text>
              <ScrollView>
                <Text style={[styles.textBody, { fontSize: FontSizes.regular, lineHeight: LineHeights.medium }]}>
                  Tap to explore and manage your imported datasets. You can check summaries or delete old data.
                </Text>
              </ScrollView>
            </TouchableOpacity>

            <TouchableOpacity style={styles.viewSection} onPress={handleViewGenerated}>
              <Text style={[styles.title, { fontSize: FontSizes.large, lineHeight: LineHeights.large }]}>View Generated Content</Text>
              <ScrollView>
                <Text style={[styles.textBody, { fontSize: FontSizes.regular, lineHeight: LineHeights.medium }]}>
                  Tap to view your AI-generated flashcards, quizzes, and study summaries.
                </Text>
              </ScrollView>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark.background },
  container: { flex: 1, padding: Spacing.md },
  topBar: { marginBottom: Spacing.md },
  importSection: {
    flex: 2,
    backgroundColor: Colors.dark.card,
    borderRadius: 24,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  rightColumn: { flex: 3, justifyContent: 'space-between' },
  viewSection: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  title: { fontWeight: '700', color: '#F8FAFC', marginBottom: Spacing.sm },
  subtitle: { color: '#CBD5E1', marginBottom: Spacing.md },
  textBody: { color: '#94A3B8' },
  button: {
    backgroundColor: '#6366F1',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
});
