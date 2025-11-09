import { Stack } from 'expo-router';
import { SettingsProvider } from './settingsProvider';

export default function RootLayout() {
  return (
    <SettingsProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SettingsProvider>
  );
}
