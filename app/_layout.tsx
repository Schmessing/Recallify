// app/_layout.tsx
import { Stack } from 'expo-router';
import { SettingsProvider } from './settingsProvider'; // import the provider

export default function RootLayout() {
  return (
    <SettingsProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SettingsProvider>
  );
}
