import { StatusBar } from 'expo-status-bar';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { baseStyles } from '../constants/homeStyles';
import { useScale } from '../hooks/scale';
import ModalScreen from './modal';

export default function Home() {
  const { scaleValue, isMobile } = useScale();

  const handleImport = () => alert('Starting import process...');
  const handleViewDatasets = () => alert('Opening your datasets...');
  const handleViewGenerated = () => alert('Opening your generated content...');

  return (
    <SafeAreaProvider>
      <SafeAreaView style={baseStyles.safe} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />

        {/* Top Bar */}
        <View style={baseStyles.topBar}>
          <ModalScreen />
        </View>

        {/* Main Content */}
        <View
          style={[
            baseStyles.container,
            { flexDirection: isMobile ? 'column' : 'row' },
          ]}
        >
          {/* Left: Import Section */}
          <View
            style={[
              baseStyles.importSection,
              {
                padding: scaleValue(24),
                marginRight: isMobile ? 0 : scaleValue(16),
                marginBottom: isMobile ? scaleValue(16) : 0,
              },
            ]}
          >
            <Text
              style={[
                baseStyles.title,
                { fontSize: scaleValue(24), lineHeight: scaleValue(28) },
              ]}
            >
              Import
            </Text>

            <Text
              style={[
                baseStyles.subtitle,
                { fontSize: scaleValue(14), lineHeight: scaleValue(18) },
              ]}
            >
              Upload your study materials here.
            </Text>

            <TouchableOpacity
              style={[
                baseStyles.button,
                {
                  paddingVertical: scaleValue(14),
                  paddingHorizontal: scaleValue(22),
                },
              ]}
              onPress={handleImport}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  baseStyles.buttonText,
                  { fontSize: scaleValue(16), lineHeight: scaleValue(20) },
                ]}
              >
                Import Data
              </Text>
            </TouchableOpacity>
          </View>

          {/* Right Column */}
          <View style={baseStyles.rightColumn}>
            {/* View Datasets */}
            <TouchableOpacity
              style={[baseStyles.viewSection, { padding: scaleValue(30) }]}
              onPress={handleViewDatasets}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  baseStyles.title,
                  { fontSize: scaleValue(20), lineHeight: scaleValue(24) },
                ]}
              >
                View Datasets
              </Text>
              <ScrollView>
                <Text
                  style={[
                    baseStyles.textBody,
                    { fontSize: scaleValue(14), lineHeight: scaleValue(18) },
                  ]}
                >
                  Tap to explore and manage your imported datasets. You can
                  check summaries or delete old data.
                </Text>
              </ScrollView>
            </TouchableOpacity>

            {/* View Generated Content */}
            <TouchableOpacity
              style={[baseStyles.viewSection, { padding: scaleValue(30) }]}
              onPress={handleViewGenerated}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  baseStyles.title,
                  { fontSize: scaleValue(20), lineHeight: scaleValue(24) },
                ]}
              >
                View Generated Content
              </Text>
              <ScrollView>
                <Text
                  style={[
                    baseStyles.textBody,
                    { fontSize: scaleValue(14), lineHeight: scaleValue(18) },
                  ]}
                >
                  Tap to view your AI-generated flashcards, quizzes, and study
                  summaries.
                </Text>
              </ScrollView>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
