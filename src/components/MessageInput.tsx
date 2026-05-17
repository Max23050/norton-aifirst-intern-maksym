import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '../theme/colors';

export interface MessageInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onPastePress: () => void;
  isSubmitting: boolean;
  submitDisabled: boolean;
  errorMessage?: string;
}

export function MessageInput({
  value,
  onChangeText,
  onSubmit,
  onPastePress,
  isSubmitting,
  submitDisabled,
  errorMessage,
}: MessageInputProps) {
  const ctaDisabled = submitDisabled || isSubmitting;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Message</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Paste message from clipboard"
          disabled={isSubmitting}
          onPress={onPastePress}
          style={({ pressed }) => [
            styles.pasteButton,
            isSubmitting && styles.disabled,
            pressed && !isSubmitting && styles.pressed,
          ]}
        >
          <Text style={styles.pasteText}>Paste</Text>
        </Pressable>
      </View>

      <TextInput
        accessibilityLabel="Message to analyze"
        multiline
        onChangeText={onChangeText}
        placeholder="Paste SMS, email, or URL"
        placeholderTextColor={colors.black}
        editable={!isSubmitting}
        style={[styles.input, isSubmitting && styles.disabled]}
        textAlignVertical="top"
        value={value}
      />

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Analyze message"
        disabled={ctaDisabled}
        onPress={onSubmit}
        style={({ pressed }) => [
          styles.ctaButton,
          ctaDisabled && styles.disabled,
          pressed && !ctaDisabled && styles.pressed,
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.black} size="small" />
        ) : null}
        <Text style={styles.ctaText}>{isSubmitting ? 'Analyzing' : 'Analyze'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    gap: 16,
    padding: 18,
    backgroundColor: colors.cardWhite,
    borderWidth: 1,
    borderColor: colors.black,
    borderRadius: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    color: colors.black,
    fontSize: 16,
    fontWeight: '800',
  },
  pasteButton: {
    minHeight: 36,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.black,
    borderRadius: 999,
    backgroundColor: colors.cardWhite,
  },
  pasteText: {
    color: colors.black,
    fontSize: 14,
    fontWeight: '800',
  },
  input: {
    minHeight: 180,
    padding: 14,
    color: colors.black,
    borderWidth: 1,
    borderColor: colors.black,
    borderRadius: 8,
    fontSize: 16,
    lineHeight: 23,
    backgroundColor: colors.cardWhite,
  },
  errorText: {
    color: colors.risk.dangerous,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  ctaButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primaryYellow,
    borderWidth: 1,
    borderColor: colors.black,
    borderRadius: 999,
  },
  ctaText: {
    color: colors.black,
    fontSize: 17,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.55,
  },
});
