import { StyleSheet, Text, View } from 'react-native';

import type { FlaggedReason, Severity } from '../models';
import { colors } from '../theme/colors';

export interface ReasonItemProps {
  reason: FlaggedReason;
}

export function ReasonItem({ reason }: ReasonItemProps) {
  const severityColor = severityColors[reason.severity];

  return (
    <View style={styles.container}>
      <View style={[styles.marker, { backgroundColor: severityColor }]} />
      <View style={styles.content}>
        <View style={styles.metaRow}>
          <Text style={styles.category}>{formatCategory(reason.category)}</Text>
          <Text style={[styles.severity, { color: severityColor }]}>
            {reason.severity.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.description}>{reason.description}</Text>
      </View>
    </View>
  );
}

const severityColors: Record<Severity, string> = {
  low: colors.risk.safe,
  medium: colors.risk.suspicious,
  high: colors.risk.dangerous,
};

function formatCategory(category: FlaggedReason['category']): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.black,
  },
  marker: {
    width: 8,
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.black,
  },
  content: {
    flex: 1,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  category: {
    color: colors.black,
    fontSize: 14,
    fontWeight: '700',
  },
  severity: {
    fontSize: 12,
    fontWeight: '800',
  },
  description: {
    color: colors.black,
    fontSize: 15,
    lineHeight: 21,
  },
});
