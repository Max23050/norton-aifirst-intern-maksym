import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RiskAssessment, RiskLevel } from '../models';
import { colors } from '../theme/colors';
import { ReasonItem } from './ReasonItem';

export interface ResultCardProps {
  assessment: RiskAssessment;
  onReset: () => void;
}

export function ResultCard({ assessment, onReset }: ResultCardProps) {
  const riskLabel = riskLabels[assessment.riskLevel];
  const riskColor = colors.risk[assessment.riskLevel];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.headline}>
          <Text style={[styles.riskWord, { color: riskColor }]}>{riskLabel}</Text>
          <Text style={styles.headlineRest}> detected</Text>
        </Text>
        <Text style={styles.explanation}>{assessment.explanation}</Text>
      </View>

      <View style={styles.reasons}>
        {assessment.flaggedReasons.length > 0 ? (
          assessment.flaggedReasons.map((reason) => (
            <ReasonItem key={`${reason.category}-${reason.description}`} reason={reason} />
          ))
        ) : (
          <Text style={styles.emptyText}>No specific scam indicators were found.</Text>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Analyze another message"
        onPress={onReset}
        style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}
      >
        <Text style={styles.resetText}>Check another</Text>
      </Pressable>
    </View>
  );
}

const riskLabels: Record<RiskLevel, string> = {
  safe: 'Safe',
  suspicious: 'Suspicious',
  dangerous: 'Dangerous',
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    gap: 18,
    padding: 20,
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
  header: {
    gap: 12,
  },
  headline: {
    color: colors.black,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
  },
  riskWord: {
    fontWeight: '900',
  },
  headlineRest: {
    color: colors.black,
    fontWeight: '900',
  },
  explanation: {
    color: colors.black,
    fontSize: 16,
    lineHeight: 23,
  },
  reasons: {
    gap: 0,
  },
  emptyText: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.black,
    color: colors.black,
    fontSize: 15,
    lineHeight: 21,
  },
  resetButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.black,
    borderRadius: 999,
    backgroundColor: colors.cardWhite,
  },
  resetText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.72,
  },
});
