import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export default function TopBar() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={{ color: '#000' }}>Recallify</ThemedText>

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
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomColor: '#fff',
    borderBottomWidth: 1,
  },
  rightSection: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#8fded0',
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },
});
