import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface, Text, Chip, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PredictionResponse } from '../services/api';
import { C, TREND } from '../theme';

interface Props {
  prediction: PredictionResponse;
  compact?:   boolean;
}

export default function PriceCard({ prediction, compact }: Props) {
  const t = TREND[prediction.trend] || TREND.stable;
  const name = prediction.vegetable.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  const changePct = prediction.current_price
    ? (((prediction.predicted_price - prediction.current_price) / prediction.current_price) * 100).toFixed(1)
    : null;

  if (compact) {
    return (
      <View style={styles.compact}>
        <View style={[styles.dot, { backgroundColor: t.color }]} />
        <Text variant="bodyMedium" style={[styles.compactName, { textTransform: 'capitalize' }]}>{name}</Text>
        <View style={{ flex: 1 }} />
        <Text variant="labelMedium" style={{ color: C.text3, marginRight: 8 }}>
          {t.emoji} {prediction.trend}
        </Text>
        <Text variant="titleSmall" style={{ color: t.color, fontWeight: '700', minWidth: 55, textAlign: 'right' }}>
          ₹{prediction.predicted_price.toFixed(0)}
        </Text>
        {changePct && (
          <Text variant="labelSmall" style={{ color: t.color, minWidth: 46, textAlign: 'right' }}>
            {Number(changePct) > 0 ? '+' : ''}{changePct}%
          </Text>
        )}
      </View>
    );
  }

  return (
    <Surface style={[styles.card, { borderColor: `${t.color}30` }]} elevation={1}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: `${t.color}20` }]}>
          <MaterialCommunityIcons
            name={prediction.trend === 'up' ? 'trending-up' : prediction.trend === 'down' ? 'trending-down' : 'minus'}
            size={18}
            color={t.color}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="titleMedium" style={{ color: C.text, fontWeight: '700', textTransform: 'capitalize' }}>
            {name}
          </Text>
          <Text variant="labelSmall" style={{ color: C.text3 }}>{prediction.prediction_date}</Text>
        </View>
        <Chip
          compact
          style={{ backgroundColor: `${t.color}20` }}
          textStyle={{ color: t.color, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}
        >
          {t.emoji} {prediction.trend.toUpperCase()}
        </Chip>
      </View>

      <Divider style={{ backgroundColor: C.border, marginVertical: 12 }} />

      {/* Prices */}
      <View style={styles.priceRow}>
        {prediction.current_price != null && (
          <View style={styles.priceCol}>
            <Text variant="labelSmall" style={styles.priceLabel}>TODAY</Text>
            <Text variant="titleLarge" style={{ color: C.text2, fontWeight: '700' }}>
              ₹{prediction.current_price.toFixed(0)}
            </Text>
          </View>
        )}
        <View style={[styles.priceCol, prediction.current_price != null && styles.priceBorder]}>
          <Text variant="labelSmall" style={styles.priceLabel}>TOMORROW</Text>
          <Text variant="headlineSmall" style={{ color: t.color, fontWeight: '900' }}>
            ₹{prediction.predicted_price.toFixed(0)}
          </Text>
          {changePct && (
            <Text variant="labelMedium" style={{ color: t.color, fontWeight: '700', marginTop: 2 }}>
              {Number(changePct) > 0 ? '+' : ''}{changePct}%
            </Text>
          )}
        </View>
        <View style={styles.priceCol}>
          <Text variant="labelSmall" style={styles.priceLabel}>RANGE</Text>
          <Text variant="bodyMedium" style={{ color: C.text2 }}>₹{prediction.confidence_lower.toFixed(0)}</Text>
          <Text variant="labelSmall" style={{ color: C.text3 }}>–</Text>
          <Text variant="bodyMedium" style={{ color: C.text2 }}>₹{prediction.confidence_upper.toFixed(0)}</Text>
        </View>
      </View>

      {prediction.model_name && (
        <Text variant="labelSmall" style={styles.modelTag}>⚡ {prediction.model_name}</Text>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20, padding: 16,
    marginHorizontal: 16, marginBottom: 10,
    borderWidth: 1, backgroundColor: C.surface,
  },
  header:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  priceRow:    { flexDirection: 'row', justifyContent: 'space-between' },
  priceCol:    { flex: 1, alignItems: 'center', gap: 4 },
  priceBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border },
  priceLabel:  { color: C.text3, letterSpacing: 1, textTransform: 'uppercase', fontSize: 9 },

  modelTag: { color: C.text3, textAlign: 'right', marginTop: 12 },

  // Compact
  compact:     {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 13, paddingHorizontal: 16,
  },
  dot:         { width: 7, height: 7, borderRadius: 4 },
  compactName: { color: C.text, fontWeight: '600' },
});
