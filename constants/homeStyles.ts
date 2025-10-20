import { StyleSheet } from 'react-native';

export const baseStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  importSection: {
    flex: 2,
    backgroundColor: '#111827',
    borderRadius: 24,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  rightColumn: {
    flex: 3,
    justifyContent: 'space-between',
  },
  viewSection: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  topBar: {
    marginBottom: 16,
  },
  title: {
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 10,
  },
  subtitle: {
    color: '#CBD5E1',
    marginBottom: 20,
  },
  textBody: {
    color: '#94A3B8',
  },
  button: {
    backgroundColor: '#6366F1',
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
