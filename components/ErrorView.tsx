import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';

interface ErrorViewProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export default function ErrorView({ message, onRetry, retryLabel = 'Try again' }: ErrorViewProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle" size={48} color={Colors.accent} />
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Pressable style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>{retryLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  message: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  buttonText: {
    color: Colors.background,
    fontWeight: 'bold',
    fontSize: 15,
  },
});
