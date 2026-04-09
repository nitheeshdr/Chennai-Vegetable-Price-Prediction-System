import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface, Text, Chip, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PredictionResponse } from '../services/api';
import { C, SP, SHAPE, TREND } from '../theme';

interface Props {
  prediction: PredictionResponse;
  compact?:   boolean;
}

export default function PriceCard({ prediction, compact }: Props) {
  const t    = TREND[prediction.trend] || TREND.stable;
  const name = prediction.vegetable.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  const changePct = prediction.current_price
    ? (((prediction.predicted_price - prediction.current_price) / prediction.current_price) * 100).toFixed(1)
    : null;

  if (compact) {
    return (
      <View style={s.compact}>
        <View style={[s.dot, { backgroundColor: t.color }]} />
        <Text variant="bodyMedium" style={s.compactName}>{name}</Text>
        <View style={{ flex: 1 }} />
        <Text variant="labelMedium" style={{ color: C.text3, marginRight: SP.sm }}>
          {t.emoji} {prediction.trend}
        </Text>
        <Text variant="titleSmall" style={{ color: t.color, fontWeight: '700', minWidth: 52, textAlign: 'right' }}>
          ₹{prediction.predicted_price.toFixed(0)}
        </Text>
        {changePct && (
          <Text variant="labelSmall" style={{ color: t.color, minWidth: 48, textAlign: 'right' }}>
            {Number(changePct) > 0 ? '+' : ''}{changePct}%
          </Text>
        )}
      </View>
    );
  }

  return (
    <Surface style={[s.card, { borderColor: `${t.color}30` }]} elevation={1}>
      {/* Header */}
      <View style={s.header}>
        <View style={[s.iconWrap, { backgroundColor: `${t.color}18` }]}>
          <MaterialCommunityIcons
            name={prediction.trend === 'up' ? 'trending-up' : prediction.trend === 'down' ? 'trending-down' : 'minus'}
            size={20}
            color={t.color}
          />
        </View>
        <View style={{ flex: 1, gap: SP.xs }}>
          <Text variant="titleMedium" style={{ color: C.text, fontWeight: '700', textTransform: 'capitalize' }}>
            {name}
          </Text>
          <Text variant="labelSmall" style={{ color: C.text3 }}>{prediction.prediction_date}</Text>
        </View>
        <Chip
          compact
          style={{ backgroundColor: `${t.color}18` }}
          textStyle={{ color: t.color, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}
        >
          {t.emoji} {prediction.trend.toUpperCase()}
        </Chip>
      </View>

      <Divider style={{ backgroundColor: C.border, marginVertical: SP.md }} />

      {/* Prices */}
      <View style={s.priceRow}>
        {prediction.current_price != null && (
          <View style={s.priceCol}>
            <Text variant="labelSmall" style={s.priceLabel}>TODAY</Text>
            <Text variant="titleLarge" style={{ color: C.text2, fontWeight: '700' }}>
              ₹{prediction.current_price.toFixed(0)}
            </Text>
          </View>
        )}
        <View style={[s.priceCol, prediction.current_price != null && s.priceMid]}>
          <Text variant="labelSmall" style={s.priceLabel}>TOMORROW</Text>
          <Text variant="headlineSmall" style={{ color: t.color, fontWeight: '900' }}>
            ₹{prediction.predicted_price.toFixed(0)}
          </Text>
          {changePct && (
            <Text variant="labelMedium" style={{ color: t.color, fontWeight: '700', marginTop: SP.xs }}>
              {Number(changePct) > 0 ? '+' : ''}{changePct}%
            </Text>
          )}
        </View>
        <View style={s.priceCol}>
          <Text variant="labelSmall" style={s.priceLabel}>RANGE</Text>
          <Text variant="bodyMedium" style={{ color: C.text2 }}>₹{prediction.confidence_lower.toFixed(0)}</Text>
          <Text variant="labelSmall" style={{ color: C.text3 }}>–</Text>
          <Text variant="bodyMedium" style={{ color: C.text2 }}>₹{prediction.confidence_upper.toFixed(0)}</Text>
        </View>
      </View>

      {prediction.model_name && (
        <Text variant="labelSmall" style={s.modelTag}>⚡ {prediction.model_name}</Text>
      )}
    </Surface>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: SHAPE.xl, padding: SP.lg,
    marginHorizontal: SP.lg, marginBottom: SP.md,
    borderWidth: 1, backgroundColor: C.surface,
  },
  header:   { flexDirection: 'row', alignItems: 'center', gap: SP.md },
  iconWrap: { width: 42, height: 42, borderRadius: SHAPE.md, justifyContent: 'center', alignItems: 'center' },

  priceRow: { flexDirection: 'row' },
  priceCol: { flex: 1, alignItems: 'center', gap: SP.xs, paddingVertical: SP.sm },
  priceMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border },
  priceLabel: { color: C.text3, letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 9 },

  modelTag: { color: C.text3, textAlign: 'right', marginTop: SP.md },

  compact:     { flexDirection: 'row', alignItems: 'center', gap: SP.sm, paddingVertical: 13, paddingHorizontal: SP.lg },
  dot:         { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  compactName: { color: C.text, fontWeight: '600', textTransform: 'capitalize' },
});
