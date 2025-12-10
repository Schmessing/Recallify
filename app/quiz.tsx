import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSettings } from '../constants/settingsProvider';
import { FontSizes, Spacing } from '../constants/theme';

type QuestionRow = {
  id: number;
  question: string;
  answer: string;
};

type FalseAnswerRow = {
  false_answer: string;
};

type QuizQuestion = {
  id: number;
  question: string;
  correctAnswer: string;
  options: string[];
};

const shuffleArray = <T,>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const QuizScreen = () => {
  const db = useSQLiteContext();
  const router = useRouter();
  const { theme } = useSettings();

  const [loading, setLoading] = useState(true);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const currentQuestion = useMemo(
    () => quizQuestions[currentIndex],
    [quizQuestions, currentIndex]
  );

  const loadQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      const questionRows = await db.getAllAsync<QuestionRow>(
        'SELECT id, question, answer FROM questions'
      );

      if (!questionRows || questionRows.length === 0) {
        setQuizQuestions([]);
        setLoading(false);
        return;
      }

      const quizData: QuizQuestion[] = [];

      for (const q of questionRows) {
        const falseRows = await db.getAllAsync<FalseAnswerRow>(
          'SELECT false_answer FROM false_answers WHERE questions_id = ?',
          [q.id]
        );

        const falseAnswers = (falseRows || [])
          .map((fr) => fr.false_answer)
          .filter((fa) => !!fa && fa.trim().length > 0);

        const uniqueFalseAnswers = Array.from(new Set(falseAnswers)).slice(0, 3);

        const options = shuffleArray<string>([
          q.answer,
          ...uniqueFalseAnswers,
        ]);

        quizData.push({
          id: q.id,
          question: q.question,
          correctAnswer: q.answer,
          options,
        });
      }

      setQuizQuestions(shuffleArray(quizData));
    } catch (e) {
      console.error(e);
      setError('Failed to load quiz questions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const handleSelectOption = (option: string) => {
    if (selectedOption || !currentQuestion) return;
    setSelectedOption(option);
    if (option === currentQuestion.correctAnswer) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < quizQuestions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
    } else {
      setIsFinished(true);
    }
  };

  const handleRestart = () => {
    setScore(0);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsFinished(false);
    loadQuestions();
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, styles.center, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator size="large" color={theme.teal} />
        <Text style={{ color: theme.text, marginTop: 8 }}>Loading quiz...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        style={[styles.container, styles.center, { backgroundColor: theme.background }]}
      >
        <Text style={{ color: 'red', marginBottom: Spacing.md }}>{error}</Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: theme.teal }]}
          onPress={loadQuestions}
        >
          <Text style={styles.btnText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnOutline, { borderColor: theme.teal, marginTop: Spacing.sm }]}
          onPress={() => router.push('/home')}
        >
          <Text style={[styles.btnText, { color: theme.teal }]}>Back to Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!quizQuestions.length) {
    return (
      <SafeAreaView
        style={[styles.container, styles.center, { backgroundColor: theme.background }]}
      >
        <Text style={{ color: theme.text, marginBottom: Spacing.md }}>
          No quiz questions found in the database.
        </Text>
        <TouchableOpacity
          style={[styles.btnOutline, { borderColor: theme.teal }]}
          onPress={() => router.push('/home')}
        >
          <Text style={[styles.btnText, { color: theme.teal }]}>Back to Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (isFinished) {
    const total = quizQuestions.length;
    const percent = total > 0 ? Math.round((score / total) * 100) : 0;

    return (
      <SafeAreaView
        style={[styles.container, styles.center, { backgroundColor: theme.background }]}
      >
        <Text style={[styles.title, { color: theme.text, marginBottom: Spacing.sm }]}>
          Quiz Complete
        </Text>
        <Text style={[styles.subtitle, { color: theme.text }]}>
          Score: {score} / {total} ({percent}%)
        </Text>

        <View style={{ marginTop: Spacing.lg, width: '100%' }}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.teal }]}
            onPress={handleRestart}
          >
            <Text style={styles.btnText}>Restart Quiz</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnOutline, { borderColor: theme.teal, marginTop: Spacing.sm }]}
            onPress={() => router.push('/home')}
          >
            <Text style={[styles.btnText, { color: theme.teal }]}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/home')}
        >
          <Text style={[styles.backButtonText, { color: theme.teal }]}>
            ← Back to Home
          </Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: theme.text }]}>Quiz Mode</Text>

        <Text style={[styles.progress, { color: theme.text + 'cc' }]}>
          Question {currentIndex + 1} of {quizQuestions.length}
        </Text>

        {currentQuestion && (
          <View
            style={[
              styles.questionCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.questionText, { color: theme.text }]}>
              {currentQuestion.question}
            </Text>
          </View>
        )}

        <View style={styles.optionsContainer}>
          {currentQuestion?.options.map((opt) => {
            const isSelected = selectedOption === opt;
            const isCorrect = opt === currentQuestion.correctAnswer;

            let backgroundColor = theme.card;
            let borderColor = theme.border;

            if (selectedOption) {
              if (isCorrect) {
                backgroundColor = '#3cba54';
                borderColor = '#3cba54';
              } else if (isSelected && !isCorrect) {
                backgroundColor = '#db3236';
                borderColor = '#db3236';
              }
            } else if (isSelected) {
              backgroundColor = theme.teal;
              borderColor = theme.teal;
            }

            return (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.optionButton,
                  { backgroundColor, borderColor },
                ]}
                disabled={!!selectedOption}
                onPress={() => handleSelectOption(opt)}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: selectedOption ? '#fff' : theme.text },
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedOption && (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.teal, marginTop: Spacing.lg }]}
            onPress={handleNext}
          >
            <Text style={styles.btnText}>
              {currentIndex + 1 < quizQuestions.length ? 'Next Question' : 'Finish Quiz'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  scroll: {
    flexGrow: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    marginBottom: Spacing.sm,
  },
  backButtonText: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
  },
  title: {
    fontSize: FontSizes.xlarge,
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.large,
    fontWeight: '700',
  },
  progress: {
    marginBottom: Spacing.md,
    fontSize: FontSizes.small,
  },
  questionCard: {
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  questionText: {
    fontSize: FontSizes.large,
    fontWeight: '700',
  },
  optionsContainer: {
    gap: Spacing.sm,
  },
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionText: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
  },
  btn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
  },
  btnOutline: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
});

export default QuizScreen;
