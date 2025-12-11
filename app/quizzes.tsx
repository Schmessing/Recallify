import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useSettings } from '../constants/settingsProvider';
import { Colors, Spacing } from '../constants/theme';

type Quiz = {
  id: number;
  title: string;
  created_at: string;
};

type Question = {
  id: number;
  question: string;
  answer: string;
};

type Mode = 'mc' | 'tf';

export default function QuizzesScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { darkMode } = useSettings();
  const theme = darkMode ? Colors.dark : Colors.light;

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>('mc'); // multiple-choice by default
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

  // Multiple choice state
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);

  // True / False state
  const [tfSelection, setTfSelection] = useState<'true' | 'false' | null>(null);

  // ----------------------------------------------------
  // Helpers
  // ----------------------------------------------------
  const shuffle = (arr: any[]) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const resetQuizRun = () => {
    setCurrentIndex(0);
    setScore(0);
    setHasAnswered(false);
    setLastCorrect(null);
    setSelectedOptionIndex(null);
    setTfSelection(null);
  };

  // ----------------------------------------------------
  // Load quizzes
  // ----------------------------------------------------
  const loadQuizzes = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await db.getAllAsync<Quiz>(
        `SELECT id, title, created_at FROM quizzes ORDER BY created_at DESC`
      );
      setQuizzes(rows);
    } catch (err: any) {
      console.error('Failed to load quizzes:', err);
      setError('Failed to load quizzes. Make sure the database is initialized.');
    } finally {
      setLoading(false);
    }
  };

  // Load questions for one quiz
  const loadQuestionsForQuiz = async (quizId: number) => {
    setLoading(true);
    setError(null);
    try {
      const rows = await db.getAllAsync<Question>(
        `
        SELECT q.id, q.question, q.answer
        FROM quiz_questions qq
        JOIN questions q ON q.id = qq.questions_id
        WHERE qq.quiz_id = ?
        ORDER BY q.id ASC
      `,
        [quizId]
      );
      setQuestions(rows);
      resetQuizRun();
    } catch (err: any) {
      console.error('Failed to load questions:', err);
      setError('Failed to load questions for this quiz.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  // ----------------------------------------------------
  // Build MC options when question changes (MC mode only)
  // ----------------------------------------------------
  useEffect(() => {
    if (!selectedQuiz || !questions.length || mode !== 'mc') {
      setOptions([]);
      setSelectedOptionIndex(null);
      return;
    }

    const q = questions[currentIndex];
    if (!q) return;

    const otherAnswers = questions
      .filter((qq) => qq.id !== q.id && qq.answer && qq.answer.trim())
      .map((qq) => qq.answer);

    const distractors = shuffle(otherAnswers).slice(0, 3);
    const allOptions = shuffle([...distractors, q.answer]);

    setOptions(allOptions);
    setSelectedOptionIndex(null);
    setHasAnswered(false);
    setLastCorrect(null);
  }, [mode, questions, currentIndex, selectedQuiz]);

  // Reset per-question state when switching to TF
  useEffect(() => {
    if (mode === 'tf') {
      setTfSelection(null);
      setHasAnswered(false);
      setLastCorrect(null);
    }
  }, [mode, currentIndex, questions.length]);

  // ----------------------------------------------------
  // Derived values
  // ----------------------------------------------------
  const currentQuestion: Question | null = useMemo(() => {
    if (!questions.length) return null;
    return questions[currentIndex] ?? null;
  }, [questions, currentIndex]);

  const isLastQuestion = useMemo(
    () => questions.length > 0 && currentIndex === questions.length - 1,
    [questions.length, currentIndex]
  );

  const allowTrueFalse = useMemo(() => {
    if (!currentQuestion) return false;
    const ans = currentQuestion.answer.trim().toLowerCase();
    const trueLike = ['true', 't', 'yes', 'y', 'correct'];
    const falseLike = ['false', 'f', 'no', 'n', 'incorrect'];
    return trueLike.includes(ans) || falseLike.includes(ans);
  }, [currentQuestion]);

  const trueIsCorrect = useMemo(() => {
    if (!currentQuestion) return false;
    const ans = currentQuestion.answer.trim().toLowerCase();
    const trueLike = ['true', 't', 'yes', 'y', 'correct'];
    return trueLike.includes(ans);
  }, [currentQuestion]);

  // ----------------------------------------------------
  // Handlers
  // ----------------------------------------------------
  const handleSelectQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setQuestions([]);
    resetQuizRun();
    loadQuestionsForQuiz(quiz.id);
  };

  const handleBackFromQuiz = () => {
    setSelectedQuiz(null);
    setQuestions([]);
    resetQuizRun();
  };

  const handleMCSelect = (index: number) => {
    if (!currentQuestion || hasAnswered) return;
    if (!options.length) return;

    setSelectedOptionIndex(index);
    const chosen = options[index];
    const correct = chosen === currentQuestion.answer;
    setHasAnswered(true);
    setLastCorrect(correct);
    if (correct) setScore((s) => s + 1);
  };

  const handleTFSelect = (choice: 'true' | 'false') => {
    if (!currentQuestion || hasAnswered) return;
    if (!allowTrueFalse) {
      // Not really T/F content; just reveal answer
      setTfSelection(choice);
      setHasAnswered(true);
      setLastCorrect(false);
      return;
    }

    const correct = (choice === 'true' && trueIsCorrect) || (choice === 'false' && !trueIsCorrect);
    setTfSelection(choice);
    setHasAnswered(true);
    setLastCorrect(correct);
    if (correct) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (!questions.length) return;

    if (!isLastQuestion) {
      setCurrentIndex((idx) => idx + 1);
      setHasAnswered(false);
      setLastCorrect(null);
      setSelectedOptionIndex(null);
      setTfSelection(null);
    }
  };

  const handleRestartQuiz = () => {
    resetQuizRun();
  };

  // ----------------------------------------------------
  // Render pieces
  // ----------------------------------------------------
  if (loading && !selectedQuiz) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.teal} />
        <Text style={{ color: theme.text, marginTop: 10 }}>Loading quizzes...</Text>
      </View>
    );
  }

  if (error && !selectedQuiz) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: theme.background }]}>
        <Text style={{ color: 'red', marginBottom: 12 }}>{error}</Text>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.teal }]}
          onPress={loadQuizzes}
        >
          <Text style={styles.primaryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---------------------------
  // LIST OF QUIZZES
  // ---------------------------
  if (!selectedQuiz) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.header, { color: theme.text }]}>Quizzes</Text>

        {quizzes.length === 0 ? (
          <View style={[styles.center, { flex: 1 }]}>
            <Text style={{ color: theme.text, opacity: 0.8, marginBottom: 16 }}>
              No quizzes found yet.
            </Text>
            <Text style={{ color: theme.text, opacity: 0.8, textAlign: 'center' }}>
              Try importing a file on the Import screen to generate quiz questions.
            </Text>
          </View>
        ) : (
          <FlatList
            data={quizzes}
            keyExtractor={(q) => String(q.id)}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.quizItem, { backgroundColor: theme.card }]}
                onPress={() => handleSelectQuiz(item)}
              >
                <Text style={[styles.quizTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={{ color: theme.text, opacity: 0.7, fontSize: 12 }}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}

        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: theme.teal }]}
          onPress={() => router.push('/home')}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.teal }]}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---------------------------
  // QUIZ RUN VIEW
  // ---------------------------

  // While questions are loading
  if (loading && selectedQuiz && questions.length === 0) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.teal} />
        <Text style={{ color: theme.text, marginTop: 10 }}>Loading questions...</Text>
      </View>
    );
  }

  // No questions in this quiz
  if (!loading && selectedQuiz && questions.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.header, { color: theme.text }]}>{selectedQuiz.title}</Text>
        <View style={[styles.center, { flex: 1 }]}>
          <Text style={{ color: theme.text, opacity: 0.8 }}>
            This quiz has no questions yet.
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: theme.teal }]}
          onPress={handleBackFromQuiz}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.teal }]}>Back to Quizzes</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Summary when you reach the end and have answered the last question
  const finished = isLastQuestion && hasAnswered;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.header, { color: theme.text }]}>{selectedQuiz.title}</Text>
      <Text style={{ color: theme.text, marginBottom: Spacing.sm }}>
        Question {currentIndex + 1} of {questions.length}
      </Text>
      <Text style={{ color: theme.text, marginBottom: Spacing.sm }}>
        Score: {score} / {questions.length}
      </Text>

      {/* Mode toggle */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            {
              backgroundColor: mode === 'mc' ? theme.teal : 'transparent',
              borderColor: theme.teal,
            },
          ]}
          onPress={() => {
            if (mode !== 'mc') {
              setMode('mc');
              resetQuizRun();
            }
          }}
        >
          <Text
            style={[
              styles.modeText,
              { color: mode === 'mc' ? '#fff' : theme.teal },
            ]}
          >
            Multiple Choice
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeButton,
            {
              backgroundColor: mode === 'tf' ? theme.teal : 'transparent',
              borderColor: theme.teal,
              opacity: allowTrueFalse ? 1 : 0.4,
            },
          ]}
          onPress={() => {
            if (!allowTrueFalse) return;
            if (mode !== 'tf') {
              setMode('tf');
              resetQuizRun();
            }
          }}
        >
          <Text
            style={[
              styles.modeText,
              { color: mode === 'tf' ? '#fff' : theme.teal },
            ]}
          >
            True / False
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'tf' && !allowTrueFalse && (
        <Text style={{ color: theme.text, fontSize: 12, marginBottom: Spacing.sm }}>
          This question doesn't look like a True/False style answer. Multiple Choice may work
          better here.
        </Text>
      )}

      {/* Question card */}
      {currentQuestion && (
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.questionLabel, { color: theme.teal }]}>QUESTION</Text>
          <Text style={[styles.questionText, { color: theme.text }]}>
            {currentQuestion.question}
          </Text>

          {/* Answer/choices */}
          {mode === 'mc' ? (
            <View style={{ marginTop: Spacing.md }}>
              {options.map((opt, idx) => {
                const isSelected = selectedOptionIndex === idx;
                const isCorrectChoice = currentQuestion && opt === currentQuestion.answer;

                let bg = 'transparent';
                let border = theme.teal;

                if (hasAnswered && isSelected) {
                  bg = isCorrectChoice ? '#16a34a' : '#b91c1c';
                  border = isCorrectChoice ? '#16a34a' : '#b91c1c';
                } else if (hasAnswered && isCorrectChoice) {
                  border = '#16a34a';
                }

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.optionButton,
                      { borderColor: border, backgroundColor: bg },
                    ]}
                    onPress={() => handleMCSelect(idx)}
                    disabled={hasAnswered}
                  >
                    <Text
                      style={{
                        color: hasAnswered && isSelected ? '#fff' : theme.text,
                        fontWeight: '600',
                      }}
                    >
                      {String.fromCharCode(65 + idx)}. {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={{ marginTop: Spacing.md }}>
              <View style={styles.tfRow}>
                <TouchableOpacity
                  style={[
                    styles.tfButton,
                    {
                      backgroundColor:
                        tfSelection === 'true'
                          ? lastCorrect
                            ? '#16a34a'
                            : '#b91c1c'
                          : 'transparent',
                      borderColor: '#16a34a',
                    },
                  ]}
                  onPress={() => handleTFSelect('true')}
                  disabled={hasAnswered}
                >
                  <Text
                    style={{
                      color:
                        tfSelection === 'true' && hasAnswered ? '#fff' : theme.text,
                      fontWeight: '700',
                    }}
                  >
                    True
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tfButton,
                    {
                      backgroundColor:
                        tfSelection === 'false'
                          ? lastCorrect
                            ? '#16a34a'
                            : '#b91c1c'
                          : 'transparent',
                      borderColor: '#b91c1c',
                    },
                  ]}
                  onPress={() => handleTFSelect('false')}
                  disabled={hasAnswered}
                >
                  <Text
                    style={{
                      color:
                        tfSelection === 'false' && hasAnswered ? '#fff' : theme.text,
                      fontWeight: '700',
                    }}
                  >
                    False
                  </Text>
                </TouchableOpacity>
              </View>

              {hasAnswered && (
                <View style={{ marginTop: Spacing.sm }}>
                  <Text style={{ color: theme.text, fontWeight: '600' }}>
                    Correct answer: {currentQuestion.answer}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Feedback */}
          {hasAnswered && lastCorrect !== null && (
            <Text
              style={{
                marginTop: Spacing.md,
                color: lastCorrect ? '#16a34a' : '#b91c1c',
                fontWeight: '700',
              }}
            >
              {lastCorrect ? 'Correct!' : 'Incorrect.'}
            </Text>
          )}

          {/* Summary if finished */}
          {finished && (
            <View style={{ marginTop: Spacing.lg }}>
              <Text
                style={{
                  color: theme.text,
                  fontSize: 16,
                  fontWeight: '700',
                  marginBottom: 4,
                }}
              >
                Quiz complete!
              </Text>
              <Text style={{ color: theme.text }}>
                Final score: {score} / {questions.length}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Controls row */}
      <View style={{ marginTop: Spacing.lg, gap: Spacing.sm }}>
        {!finished && (
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor: hasAnswered ? theme.teal : theme.teal + '88',
              },
            ]}
            disabled={!hasAnswered || isLastQuestion}
            onPress={handleNext}
          >
            <Text style={styles.primaryButtonText}>
              {isLastQuestion ? 'Done' : 'Next'}
            </Text>
          </TouchableOpacity>
        )}

        {finished && (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.teal }]}
            onPress={handleRestartQuiz}
          >
            <Text style={styles.primaryButtonText}>Restart Quiz</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: theme.teal }]}
          onPress={handleBackFromQuiz}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.teal }]}>
            Back to Quizzes
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
  quizItem: {
    padding: Spacing.md,
    borderRadius: 14,
    marginBottom: Spacing.sm,
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    marginTop: Spacing.sm,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  secondaryButtonText: {
    fontWeight: '700',
    fontSize: 16,
  },
  card: {
    borderRadius: 18,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  questionLabel: {
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 4,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionButton: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  modeText: {
    fontWeight: '700',
    fontSize: 14,
  },
  tfRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tfButton: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
});

