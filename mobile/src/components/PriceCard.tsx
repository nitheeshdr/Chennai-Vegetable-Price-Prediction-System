import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PredictionResponse } from '../services/api';

interface Props {
  prediction: PredictionResponse;
  index?: number;
}

const TREND_COLORS = { up: '#22c55e', down: '#ef4444', stable: '#f59e0b' };
const TREND_BG = { up: '#14532d22', down: '#7f1d1d22', stable: '#78350f22' };

export default function PriceCard({ prediction, index }: Props) {
  const trendColor = TREND_COLORS[prediction.trend] || '#9ca3af';
  const trendBg = TREND_BG[prediction.trend] || '#37415122';

  return (
    <View style={[styles.card, { borderLeftColor: trendColor }]}>
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.vegName}>
            {prediction.vegetable.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </Text>
          <Text style={styles.date}>{prediction.prediction_date}</Text>
        </View>
        <View style={[styles.trendBadge, { backgroundColor: trendBg }]}>
          <Text style={[styles.trendEmoji]}>{prediction.trend_emoji}</Text>
          <Text style={[styles.trendLabel, { color: trendColor }]}>
            {prediction.trend}
          </Text>
        </View>
      </View>

      <View style={styles.priceRow}>
        {prediction.current_price != null && (
          <View style={styles.priceBlock}>
            <Text style={styles.priceLabel}>Current</Text>
            <Text style={styles.priceValue}>₹{prediction.current_price.toFixed(0)}</Text>
          </View>
        )}
        <View style={styles.priceBlock}>
          <Text style={styles.priceLabel}>Tomorrow</Text>
          <Text style={[styles.priceValue, { color: trendColor }]}>
            ₹{prediction.predicted_price.toFixed(0)}
          </Text>
        </View>
        <View style={styles.priceBlock}>
          <Text style={styles.priceLabel}>Range</Text>
          <Text style={styles.rangeText}>
            ₹{prediction.confidence_lower.toFixed(0)}–{prediction.confidence_upper.toFixed(0)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b', borderRadius: 12, padding: 16,
    marginHorizontal: 16, marginBottom: 10,
    borderLeftWidth: 4,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  left: { flex: 1 },
  vegName: { color: '#f9fafb', fontSize: 15, fontWeight: '600' },
  date: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  trendBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  trendEmoji: { fontSize: 14, marginRight: 4 },
  trendLabel: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  priceBlock: { alignItems: 'center' },
  priceLabel: { color: '#6b7280', fontSize: 11, marginBottom: 2 },
  priceValue: { color: '#f9fafb', fontSize: 17, fontWeight: 'bold' },
  rangeText: { color: '#9ca3af', fontSize: 12 },
});
