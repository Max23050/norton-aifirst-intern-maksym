import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
  Clipboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MessageInput } from './src/components/MessageInput';
import { ResultCard } from './src/components/ResultCard';
import { useScamAnalyzer } from './src/hooks/useScamAnalyzer';
import { colors } from './src/theme/colors';

const EMPTY_MESSAGE_ERROR = 'Paste or type a message first.';
const EMPTY_CLIPBOARD_ERROR = 'Clipboard is empty.';
const CLIPBOARD_ERROR = 'Unable to read from clipboard.';

export default function App() {
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState<string | undefined>();
  const { state, analyze, reset } = useScamAnalyzer();

  const isAnalyzing = state.status === 'analyzing';
  const submitDisabled = message.trim().length === 0;
  const errorMessage = localError ?? (state.status === 'error' ? state.error : undefined);

  const handleMessageChange = useCallback(
    (nextMessage: string) => {
      setMessage(nextMessage);
      setLocalError(undefined);

      if (state.status === 'error') {
        reset();
      }
    },
    [reset, state.status],
  );

  const handlePastePress = useCallback(async () => {
    try {
      const clipboardText = await Clipboard.getString();

      if (clipboardText.trim().length === 0) {
        setLocalError(EMPTY_CLIPBOARD_ERROR);
        return;
      }

      setMessage(clipboardText);
      setLocalError(undefined);

      if (state.status === 'error') {
        reset();
      }
    } catch {
      setLocalError(CLIPBOARD_ERROR);
    }
  }, [reset, state.status]);

  const handleSubmit = useCallback(() => {
    const trimmedMessage = message.trim();

    if (trimmedMessage.length === 0) {
      setLocalError(EMPTY_MESSAGE_ERROR);
      return;
    }

    setLocalError(undefined);
    void analyze(trimmedMessage);
  }, [analyze, message]);

  const handleReset = useCallback(() => {
    setMessage('');
    setLocalError(undefined);
    reset();
  }, [reset]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Scam Detector</Text>
          </View>

          {state.status === 'success' ? (
            <ResultCard assessment={state.data} onReset={handleReset} />
          ) : (
            <MessageInput
              value={message}
              onChangeText={handleMessageChange}
              onSubmit={handleSubmit}
              onPastePress={handlePastePress}
              isSubmitting={isAnalyzing}
              submitDisabled={submitDisabled}
              errorMessage={errorMessage}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundCream,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  header: {
    gap: 6,
  },
  title: {
    color: colors.black,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
  },
});
