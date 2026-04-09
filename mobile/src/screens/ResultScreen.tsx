import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Surface, Text, Card, Button, Chip, ProgressBar, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScanResponse } from '../services/api';
import { useC, useTREND } from '../context/ThemeContext';
import { SP, SHAPE } from '../theme';

export default function ResultScreen({ route, navigation }: any) {
  const C     = useC();
  const TREND = useTREND();
  const { scanResult } = route.params as { scanResult: ScanResponse };
  const { vegetable_detected, confidence, top_k, prediction, current_price } = scanResult;

  const name      = vegetable_detected !== 'unknown'
    ? vegetable_detected.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
    : 'Unknown Vegetable';
  const pct       = Math.round(confidence * 100);
  const confColor = pct >= 80 ? C.green : pct >= 50 ? C.amber : C.red;
  const t         = prediction ? TREND[prediction.trend] || TREND.stable : TREND.stable;
  const changePct = prediction?.current_price
    ? (((prediction.predicted_price - prediction.current_price) / prediction.current_price) * 100).toFixed(1)
    : null;

  return (
    <ScrollView style={[s.root, { backgroundColor: C.bg }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: SP.huge, paddingTop: SP.md }}>

      {/* ── Detected Vegetable ── */}
      <Card style={[s.card, { backgroundColor: C.surface }]}>
        <Card.Content style={{ gap: SP.lg }}>
          <View style={s.detectedRow}>
            <View style={[s.vegAvatar, { backgroundColor: `${C.primary}20` }]}>
              <MaterialCommunityIcons name="leaf" size={32} color={C.primary} />
            </View>
            <View style={{ flex: 1, gap: SP.xs }}>
              <Text variant="headlineMedium" style={[s.vegName, { color: C.text }]}>{name}</Text>
              <Text variant="labelMedium"    style={{ color: C.text3 }}>Vegetable detected</Text>
            </View>
          </View>
          <View style={{ gap: SP.sm }}>
            <View style={s.confRow}>
              <Text variant="labelMedium" style={{ color: C.text3 }}>Confidence</Text>
              <Text variant="labelLarge"  style={{ color: confColor, fontWeight: '700' }}>{pct}%</Text>
            </View>
            <ProgressBar progress={confidence} color={confColor}
              style={[s.progressBar, { backgroundColor: C.surface3 }]} />
          </View>
          {top_k && top_k.length > 1 && (
            <View style={s.altRow}>
              <Text variant="labelSmall" style={{ color: C.text3 }}>Also possible:</Text>
              {top_k.slice(1, 4).map(item => (
                <Chip key={item.vegetable} compact
                  style={{ backgroundColor: C.surface2 }}
                  textStyle={{ color: C.text2, fontSize: 11 }}>
                  {item.vegetable.replace(/_/g, ' ')} {(item.confidence * 100).toFixed(0)}%
                </Chip>
              ))}
            </View>
          )}
        </Card.Content>
      </Card>

      {/* ── Current Price ── */}
      {current_price && (
        <Card style={[s.card, { backgroundColor: C.surface }]}>
          <Card.Content style={{ gap: SP.md }}>
            <View style={s.cardHead}>
              <MaterialCommunityIcons name="tag-outline" size={16} color={C.sky} />
              <Text variant="titleMedium" style={[s.cardTitle, { color: C.text }]}>Current Market Price</Text>
            </View>
            <Text variant="displaySmall" style={{ color: C.green, fontWeight: '900' }}>
              ₹{current_price.modal_price?.toFixed(0) ?? '—'}
              <Text variant="titleMedium" style={{ color: C.text3, fontWeight: '400' }}>/kg</Text>
            </Text>
            {current_price.market_name && (
              <Text variant="labelMedium" style={{ color: C.text3 }}>📍 {current_price.market_name}</Text>
            )}
            {current_price.min_price != null && current_price.max_price != null && (
              <View style={s.priceRange}>
                {[
                  { label: 'Min',   val: `₹${current_price.min_price.toFixed(0)}`,         color: C.green },
                  { label: 'Modal', val: `₹${current_price.modal_price?.toFixed(0) ?? '—'}`, color: C.text  },
                  { label: 'Max',   val: `₹${current_price.max_price.toFixed(0)}`,           color: C.red   },
                ].map((item, idx) => (
                  <React.Fragment key={item.label}>
                    {idx > 0 && <Divider style={{ width: 1, height: 36, backgroundColor: C.border }} />}
                    <View style={s.rangeItem}>
                      <Text variant="labelSmall" style={{ color: C.text3 }}>{item.label}</Text>
                      <Text variant="titleSmall" style={{ color: item.color, fontWeight: '700' }}>{item.val}</Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* ── Tomorrow's Prediction ── */}
      {prediction && (
        <Card style={[s.card, { backgroundColor: C.surface }]}>
          <Card.Content style={{ gap: SP.md }}>
            <View style={s.cardHead}>
              <MaterialCommunityIcons name="crystal-ball" size={16} color={t.color} />
              <Text variant="titleMedium" style={[s.cardTitle, { color: C.text }]}>Tomorrow's Prediction</Text>
              <Chip compact style={{ backgroundColor: `${t.color}20` }}
                textStyle={{ color: t.color, fontSize: 10, fontWeight: '800' }}>
                {t.emoji} {prediction.trend.toUpperCase()}
              </Chip>
            </View>
            <View style={s.predGrid}>
              {prediction.current_price != null && (
                <View style={s.predCol}>
                  <Text variant="labelSmall" style={[s.gridLabel, { color: C.text3 }]}>TODAY</Text>
                  <Text variant="titleLarge"  style={{ color: C.text2, fontWeight: '700' }}>
                    ₹{prediction.current_price.toFixed(0)}
                  </Text>
                </View>
              )}
              <View style={[s.predCol, prediction.current_price != null && { borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border }]}>
                <Text variant="labelSmall"  style={[s.gridLabel, { color: C.text3 }]}>TOMORROW</Text>
                <Text variant="displaySmall" style={{ color: t.color, fontWeight: '900' }}>
                  ₹{prediction.predicted_price.toFixed(0)}
                </Text>
                {changePct && (
                  <Text variant="labelMedium" style={{ color: t.color, fontWeight: '700' }}>
                    {Number(changePct) > 0 ? '+' : ''}{changePct}%
                  </Text>
                )}
              </View>
              <View style={s.predCol}>
                <Text variant="labelSmall" style={[s.gridLabel, { color: C.text3 }]}>RANGE</Text>
                <Text variant="bodyMedium" style={{ color: C.text2 }}>₹{prediction.confidence_lower.toFixed(0)}</Text>
                <Text variant="labelSmall" style={{ color: C.text3 }}>–</Text>
                <Text variant="bodyMedium" style={{ color: C.text2 }}>₹{prediction.confidence_upper.toFixed(0)}</Text>
              </View>
            </View>
            {prediction.model_name && (
              <Text variant="labelSmall" style={{ color: C.text3, textAlign: 'right', marginTop: SP.xs }}>
                ⚡ {prediction.model_name}
              </Text>
            )}
          </Card.Content>
        </Card>
      )}

      {/* ── Actions ── */}
      <View style={s.actions}>
        <Button mode="contained" onPress={() => navigation.navigate('Forecast', { vegetable: vegetable_detected })}
          icon="chart-line" style={s.primaryBtn} contentStyle={{ paddingVertical: SP.sm }}>
          View 7-Day Forecast
        </Button>
        <Button mode="outlined" onPress={() => navigation.goBack()}
          icon="camera" style={s.secondaryBtn} contentStyle={{ paddingVertical: SP.xs }}>
          Scan Again
        </Button>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:     { flex: 1 },
  card:     { marginHorizontal: SP.lg, marginBottom: SP.md, borderRadius: SHAPE.xl },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: SP.sm },
  cardTitle: { fontWeight: '700', flex: 1 },

  detectedRow: { flexDirection: 'row', alignItems: 'center', gap: SP.lg },
  vegAvatar:   { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  vegName:     { fontWeight: '800', textTransform: 'capitalize' },

  confRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressBar: { height: 8, borderRadius: 4 },
  altRow:      { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SP.sm },

  priceRange: { flexDirection: 'row', alignItems: 'center', gap: SP.xxl },
  rangeItem:  { alignItems: 'center', gap: SP.xs },

  predGrid: { flexDirection: 'row' },
  predCol:  { flex: 1, alignItems: 'center', paddingVertical: SP.sm, gap: SP.xs },
  gridLabel: { letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 9 },

  actions:      { marginHorizontal: SP.lg, gap: SP.md, marginTop: SP.sm },
  primaryBtn:   { borderRadius: SHAPE.lg },
  secondaryBtn: { borderRadius: SHAPE.lg },
});
