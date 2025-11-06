import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontSizes, LineHeights } from '../constants/theme';

export default function TopBar() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={{ color: '#F8FAFC' }}>Recallify</ThemedText>

      <View style={styles.rightSection}>
        <Link href="/settings" asChild>
          <TouchableOpacity style={styles.button}>
            <Text
              style={[styles.buttonText, { fontSize: FontSizes.medium, lineHeight: LineHeights.medium }]}
            >
              Settings
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#111827',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomColor: '#1E293B',
    borderBottomWidth: 1,
  },
  rightSection: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#6366F1',
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
