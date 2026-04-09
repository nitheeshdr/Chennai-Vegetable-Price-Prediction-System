import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PredictionResponse } from '../services/api';
import { C, TREND } from '../theme';

interface Props {
  prediction: PredictionResponse;
  index?: number;
  compact?: boolean;
}

export default function PriceCard({ prediction, compact }: Props) {
  const t = TREND[prediction.trend] || TREND.stable;
  const changePct = prediction.current_price
    ? (((prediction.predicted_price - prediction.current_price) / prediction.current_price) * 100).toFixed(1)
    : null;
  const name = prediction.vegetable.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  if (compact) {
    return (
      <View style={[styles.compact, { borderColor: t.border }]}>
        <View style={[styles.dot, { backgroundColor: t.color }]} />
        <Text style={styles.compactName}>{name}</Text>
        <View style={{ flex: 1 }} />
        <Text style={[styles.compactPrice, { color: t.color }]}>₹{prediction.predicted_price.toFixed(0)}</Text>
        <Text style={[styles.compactPct, { color: t.color }]}>
          {changePct ? `${Number(changePct) > 0 ? '+' : ''}${changePct}%` : ''}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { borderColor: t.border }]}>
      <LinearGradient
        colors={[t.bg, 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.date}>{prediction.prediction_date}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: t.bg, borderColor: t.border }]}>
          <Text style={styles.emoji}>{prediction.trend_emoji}</Text>
          <Text style={[styles.badgeText, { color: t.color }]}>
            {prediction.trend.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Prices */}
      <View style={styles.prices}>
        {prediction.current_price != null && (
          <View style={styles.priceCol}>
            <Text style={styles.priceLabel}>Current</Text>
            <Text style={styles.priceVal}>₹{prediction.current_price.toFixed(0)}</Text>
          </View>
        )}
        <View style={[styles.priceCol, styles.mainPrice]}>
          <Text style={styles.priceLabel}>Tomorrow</Text>
          <Text style={[styles.priceValLg, { color: t.color }]}>
            ₹{prediction.predicted_price.toFixed(0)}
          </Text>
          {changePct && (
            <Text style={[styles.changePct, { color: t.color }]}>
              {Number(changePct) > 0 ? '+' : ''}{changePct}%
            </Text>
          )}
        </View>
        <View style={styles.priceCol}>
          <Text style={styles.priceLabel}>Range</Text>
          <Text style={styles.rangeVal}>
            ₹{prediction.confidence_lower.toFixed(0)}
          </Text>
          <Text style={styles.rangeVal}>
            ₹{prediction.confidence_upper.toFixed(0)}
          </Text>
        </View>
      </View>

      {/* Model tag */}
      <View style={styles.modelRow}>
        <Text style={styles.modelTag}>⚡ {prediction.model_name}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20, padding: 18,
    marginHorizontal: 16, marginBottom: 12,
    borderWidth: 1, overflow: 'hidden',
    backgroundColor: C.card,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  name: { color: C.text, fontSize: 16, fontWeight: '700' },
  date: { color: C.text3, fontSize: 12, marginTop: 2 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  emoji: { fontSize: 13 },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  prices: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceCol: { alignItems: 'center', flex: 1 },
  mainPrice: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border },
  priceLabel: { color: C.text3, fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  priceVal: { color: C.text2, fontSize: 18, fontWeight: '600' },
  priceValLg: { fontSize: 26, fontWeight: '800' },
  changePct: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  rangeVal: { color: C.text2, fontSize: 13, fontWeight: '500' },
  modelRow: { marginTop: 12, alignItems: 'flex-end' },
  modelTag: { color: C.text3, fontSize: 10, letterSpacing: 0.5 },
  // Compact
  compact: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.card, borderRadius: 12, padding: 12,
    marginBottom: 6, borderWidth: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  compactName: { color: C.text, fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  compactPrice: { fontSize: 15, fontWeight: '700' },
  compactPct: { fontSize: 12, width: 48, textAlign: 'right' },
});
