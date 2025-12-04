import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
// Use useSQLiteContext for hook-based access
import { useSQLiteContext } from 'expo-sqlite';
import { Colors } from '../constants/theme'; // Assuming this import works

// Define the type for the 'subjects' table data
type Subject = { id: number; name: string };
// Define the type for the 'questions' table data
type Question = { id: number; question: string; answer: string };

const viewdb = () => {
  const db = useSQLiteContext(); // Access the database instance via the hook

  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      // Use the 'db' instance directly from the hook
      
      // --- (Optional sample data setup from previous response can be added here if needed) ---

      // Fetch subjects
      const subjectsResult = await db.getAllAsync<Subject>('SELECT id, name FROM subjects');
      setSubjects(subjectsResult);

      // Fetch questions
      const questionsResult = await db.getAllAsync<Question>('SELECT id, question, answer FROM questions');
      setQuestions(questionsResult);
      
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.light.teal} />
        <Text>Loading database data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: 'red' }}>{error}</Text>
      </View>
    );
  }

  const renderSubjectItem = ({ item }: { item: Subject }) => (
    <View style={styles.item}>
      <Text style={styles.idText}>ID: {item.id}</Text>
      <Text style={styles.nameText}>Name: {item.name}</Text>
    </View>
  );

  const renderQuestionItem = ({ item }: { item: Question }) => (
    <View style={styles.item}>
      <Text style={styles.idText}>ID: {item.id}</Text>
      <Text>Q: {item.question}</Text>
      <Text>A: {item.answer}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <Text style={styles.title}>Database Contents</Text>

        <Text style={styles.subtitle}>Subjects Table</Text>
        <FlatList
          data={subjects}
          renderItem={renderSubjectItem}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={<Text style={styles.emptyText}>No subjects found.</Text>}
          scrollEnabled={false}
        />

        <Text style={styles.subtitle}>Questions Table</Text>
        <FlatList
          data={questions}
          renderItem={renderQuestionItem}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={<Text style={styles.emptyText}>No questions found.</Text>}
          scrollEnabled={false}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
    color: Colors.light.teal || '#007AFF',
  },
  item: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 5,
  },
  idText: {
    fontWeight: 'bold',
    color: '#555',
  },
  nameText: {
    marginTop: 4,
  },
  emptyText: {
    padding: 15,
    fontStyle: 'italic',
    color: '#888',
  }
});

export default viewdb;
