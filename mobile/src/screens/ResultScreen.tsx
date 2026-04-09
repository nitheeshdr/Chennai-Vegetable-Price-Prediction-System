import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Surface, Text, Card, Button, Chip, ProgressBar, Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScanResponse } from '../services/api';
import { C, TREND } from '../theme';

export default function ResultScreen({ route, navigation }: any) {
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

      {/* Detected Vegetable Card */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.detectedHeader}>
            <View style={[styles.vegIcon, { backgroundColor: `${C.primary}20` }]}>
              <MaterialCommunityIcons name="leaf" size={32} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="headlineMedium" style={styles.vegName}>{name}</Text>
              <Text variant="labelMedium" style={{ color: C.text3 }}>Detected vegetable</Text>
            </View>
          </View>

          {/* Confidence bar */}
          <View style={styles.confRow}>
            <Text variant="labelMedium" style={{ color: C.text3 }}>Confidence</Text>
            <Text variant="labelLarge" style={{ color: confColor, fontWeight: '700' }}>{pct}%</Text>
          </View>
          <ProgressBar
            progress={confidence}
            color={confColor}
            style={styles.progressBar}
          />

          {/* Alternatives */}
          {top_k && top_k.length > 1 && (
            <View style={styles.altRow}>
              <Text variant="labelSmall" style={{ color: C.text3, marginRight: 8 }}>Also possible:</Text>
              {top_k.slice(1, 4).map(item => (
                <Chip
                  key={item.vegetable}
                  compact
                  style={{ backgroundColor: C.surface2, marginRight: 6 }}
                  textStyle={{ color: C.text2, fontSize: 11 }}
                >
                  {item.vegetable.replace(/_/g, ' ')} {(item.confidence * 100).toFixed(0)}%
                </Chip>
              ))}
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Current Price Card */}
      {current_price && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="tag" size={16} color={C.sky} />
              <Text variant="titleMedium" style={styles.cardTitle}>Current Market Price</Text>
            </View>
            <Text variant="displaySmall" style={{ color: C.green, fontWeight: '900' }}>
              ₹{current_price.modal_price?.toFixed(0) ?? '—'}
              <Text variant="titleMedium" style={{ color: C.text3 }}>/kg</Text>
            </Text>
            {current_price.market_name && (
              <Text variant="labelMedium" style={{ color: C.text3, marginTop: 6 }}>
                📍 {current_price.market_name}
              </Text>
            )}
            {current_price.min_price != null && current_price.max_price != null && (
              <View style={styles.rangeRow}>
                <View style={styles.rangeBox}>
                  <Text variant="labelSmall" style={{ color: C.text3 }}>Min</Text>
                  <Text variant="titleSmall" style={{ color: C.green }}>₹{current_price.min_price.toFixed(0)}</Text>
                </View>
                <Divider style={{ width: 1, height: 36, backgroundColor: C.border }} />
                <View style={styles.rangeBox}>
                  <Text variant="labelSmall" style={{ color: C.text3 }}>Max</Text>
                  <Text variant="titleSmall" style={{ color: C.red }}>₹{current_price.max_price.toFixed(0)}</Text>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Tomorrow's Prediction Card */}
      {prediction && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="crystal-ball" size={16} color={t.color} />
              <Text variant="titleMedium" style={styles.cardTitle}>Tomorrow's Prediction</Text>
              <Chip
                compact
                style={{ backgroundColor: `${t.color}25`, marginLeft: 'auto' }}
                textStyle={{ color: t.color, fontSize: 10, fontWeight: '800' }}
              >
                {t.emoji} {prediction.trend.toUpperCase()}
              </Chip>
            </View>

            <View style={styles.predGrid}>
              {prediction.current_price != null && (
                <View style={styles.predCol}>
                  <Text variant="labelSmall" style={styles.predLabel}>TODAY</Text>
                  <Text variant="titleLarge" style={{ color: C.text2, fontWeight: '700' }}>
                    ₹{prediction.current_price.toFixed(0)}
                  </Text>
                </View>
              )}
              <View style={[styles.predCol, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border }]}>
                <Text variant="labelSmall" style={styles.predLabel}>TOMORROW</Text>
                <Text variant="displaySmall" style={{ color: t.color, fontWeight: '900' }}>
                  ₹{prediction.predicted_price.toFixed(0)}
                </Text>
                {changePct && (
                  <Text variant="labelMedium" style={{ color: t.color, fontWeight: '700', marginTop: 4 }}>
                    {Number(changePct) > 0 ? '+' : ''}{changePct}%
                  </Text>
                )}
              </View>
              <View style={styles.predCol}>
                <Text variant="labelSmall" style={styles.predLabel}>RANGE</Text>
                <Text variant="bodyMedium" style={{ color: C.text2 }}>₹{prediction.confidence_lower.toFixed(0)}</Text>
                <Text variant="bodySmall" style={{ color: C.text3 }}>to</Text>
                <Text variant="bodyMedium" style={{ color: C.text2 }}>₹{prediction.confidence_upper.toFixed(0)}</Text>
              </View>
            </View>

            {prediction.model_name && (
              <Text variant="labelSmall" style={styles.modelTag}>
                ⚡ {prediction.model_name}
              </Text>
            )}
          </Card.Content>
        </Card>
      )}

      {/* CTA */}
      <Button
        mode="contained"
        onPress={() => navigation.navigate('Forecast', { vegetable: vegetable_detected })}
        icon="chart-line"
        style={styles.forecastBtn}
        contentStyle={{ paddingVertical: 8 }}
      >
        View 7-Day Forecast
      </Button>

      <Button
        mode="outlined"
        onPress={() => navigation.goBack()}
        icon="camera"
        style={styles.scanAgainBtn}
        contentStyle={{ paddingVertical: 6 }}
      >
        Scan Again
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  card:       { marginHorizontal: 16, marginTop: 12, backgroundColor: C.surface, borderRadius: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle:  { color: C.text, fontWeight: '700', flex: 1 },

  detectedHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  vegIcon:        { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  vegName:        { color: C.text, fontWeight: '800', textTransform: 'capitalize' },

  confRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressBar: { height: 8, borderRadius: 4, backgroundColor: C.surface3 },
  altRow:      { flexDirection: 'row', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 4 },

  rangeRow: { flexDirection: 'row', gap: 24, marginTop: 14, alignItems: 'center' },
  rangeBox: { alignItems: 'center', gap: 4 },

  predGrid: { flexDirection: 'row', marginTop: 4 },
  predCol:  { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 4 },
  predLabel: { color: C.text3, letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 },

  modelTag:    { color: C.text3, marginTop: 14, textAlign: 'right' },
  forecastBtn: { marginHorizontal: 16, marginTop: 20, borderRadius: 14 },
  scanAgainBtn: { marginHorizontal: 16, marginTop: 10, borderRadius: 14 },
});
