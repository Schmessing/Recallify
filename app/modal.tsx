import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export default function TopBar() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={{ color: '#F8FAFC' }}>Recallify</ThemedText>

      <View style={styles.rightSection}>
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={styles.button}
          activeOpacity={0.8}
        >
          <ThemedText type="link" style={styles.buttonText}>
            Settings
          </ThemedText>
        </TouchableOpacity>
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
