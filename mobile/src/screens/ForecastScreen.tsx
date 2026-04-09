import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import {
  Surface, Text, Card, Chip, ActivityIndicator,
  SegmentedButtons, Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, WeeklyForecastResponse, AIPredictionResponse } from '../services/api';
import { C, TREND } from '../theme';

const W = Dimensions.get('window').width;

export default function ForecastScreen({ route, navigation }: any) {
  const { vegetable } = route.params as { vegetable: string };
  const label = vegetable.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  const insets = useSafeAreaInsets();

  const [forecast, setForecast]   = useState<WeeklyForecastResponse | null>(null);
  const [aiPred, setAiPred]       = useState<AIPredictionResponse | null>(null);
  const [loading, setLoading]     = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [mode, setMode]           = useState('seasonal');
  const [aiError, setAiError]     = useState('');

  useEffect(() => {
    api.getWeeklyForecast(vegetable)
      .then(setForecast).catch(() => setForecast(null))
      .finally(() => setLoading(false));
  }, [vegetable]);

  const fetchAI = (val: string) => {
    setMode(val);
    if (val === 'seasonal') return;
    if (aiPred) return;
    setAiLoading(true);
    setAiError('');
    api.aiPredict(vegetable)
      .then(d => setAiPred(d))
      .catch((e: any) => setAiError(e?.response?.data?.error || 'AI prediction failed — try again'))
      .finally(() => setAiLoading(false));
  };

  const today  = forecast?.forecast?.[0];
  const t      = today ? TREND[today.trend] || TREND.stable : TREND.stable;

  const chartData = forecast?.forecast?.length ? {
    labels:   forecast.forecast.map(f => f.prediction_date.slice(5)),
    datasets: [{ data: forecast.forecast.map(f => f.predicted_price), strokeWidth: 2 }],
  } : null;

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={C.primary} />
      <Text variant="bodyMedium" style={{ color: C.text3, marginTop: 12 }}>Loading forecast…</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Hero surface */}
      <Surface style={styles.hero} elevation={2}>
        <Text variant="displaySmall" style={styles.heroName}>{label}</Text>
        <Text variant="labelLarge" style={{ color: C.text3, marginTop: 2, marginBottom: 20 }}>7-Day Price Forecast</Text>
        {today && (
          <View style={styles.heroGrid}>
            <View style={styles.heroCol}>
              <Text variant="labelSmall" style={styles.heroLabel}>TODAY</Text>
              <Text variant="headlineSmall" style={{ color: C.text2, fontWeight: '700' }}>
                ₹{today.current_price?.toFixed(0) ?? '—'}
              </Text>
            </View>
            <View style={[styles.heroCol, styles.heroDivider]}>
              <Text variant="labelSmall" style={styles.heroLabel}>TOMORROW</Text>
              <Text variant="displaySmall" style={{ color: t.color, fontWeight: '900' }}>
                ₹{today.predicted_price.toFixed(0)}
              </Text>
            </View>
            <View style={styles.heroCol}>
              <Text variant="labelSmall" style={styles.heroLabel}>TREND</Text>
              <Text variant="titleLarge" style={{ color: t.color, fontWeight: '700' }}>
                {t.emoji} {today.trend}
              </Text>
            </View>
          </View>
        )}
      </Surface>

      {/* Mode toggle */}
      <SegmentedButtons
        value={mode}
        onValueChange={fetchAI}
        style={styles.segmented}
        buttons={[
          {
            value:  'seasonal',
            label:  'Seasonal',
            icon:   'chart-line',
            style:  { backgroundColor: mode === 'seasonal' ? `${C.primary}22` : C.surface },
          },
          {
            value:  'ai',
            label:  aiLoading ? 'Asking AI…' : 'AI Predict',
            icon:   'brain',
            style:  { backgroundColor: mode === 'ai' ? `${C.primary}22` : C.surface },
            disabled: aiLoading,
          },
        ]}
      />

      {/* AI Prediction Card */}
      {mode === 'ai' && aiLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text variant="bodyMedium" style={{ color: C.text3, marginTop: 12 }}>Asking AI model…</Text>
        </View>
      )}

      {mode === 'ai' && aiError ? (
        <Surface style={styles.errCard} elevation={0}>
          <MaterialCommunityIcons name="alert-circle-outline" size={20} color={C.red} />
          <Text variant="bodyMedium" style={{ color: C.red, flex: 1 }}>{aiError}</Text>
        </Surface>
      ) : null}

      {mode === 'ai' && aiPred && !aiLoading && (
        <Card style={styles.aiCard}>
          <Card.Content>
            <View style={styles.aiHeader}>
              <MaterialCommunityIcons name="brain" size={18} color={C.primary} />
              <Text variant="titleMedium" style={{ color: C.primary, flex: 1, fontWeight: '700' }}>
                AI Prediction
              </Text>
              <Chip compact style={{ backgroundColor: `${C.primary}25` }} textStyle={{ color: C.primary, fontSize: 10, fontWeight: '800' }}>
                AI
              </Chip>
            </View>
            <Text variant="displaySmall" style={{ color: C.primary, fontWeight: '900', marginTop: 8 }}>
              ₹{aiPred.predicted_price.toFixed(0)}<Text variant="titleMedium" style={{ color: C.text3 }}>/kg</Text>
            </Text>
            <Text variant="bodySmall" style={{ color: C.text3, marginTop: 4 }}>
              Range: ₹{aiPred.confidence_lower.toFixed(0)} – ₹{aiPred.confidence_upper.toFixed(0)}
            </Text>
            {aiPred.reasoning ? (
              <Surface style={styles.reasonBox} elevation={0}>
                <Text variant="labelSmall" style={{ color: C.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
                  AI Reasoning
                </Text>
                <Text variant="bodyMedium" style={{ color: C.text2, lineHeight: 20 }}>
                  {aiPred.reasoning}
                </Text>
              </Surface>
            ) : null}
            <Text variant="labelSmall" style={{ color: C.text3, marginTop: 8 }}>
              Model: {aiPred.model_name}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Chart */}
      {mode === 'seasonal' && chartData && (
        <Card style={styles.chartCard}>
          <Card.Content>
            <Text variant="titleSmall" style={{ color: C.text2, fontWeight: '700', marginBottom: 12 }}>
              Price Trend — 7 Days
            </Text>
            <LineChart
              data={chartData}
              width={W - 80}
              height={180}
              chartConfig={{
                backgroundColor:         C.surface2,
                backgroundGradientFrom:  C.surface2,
                backgroundGradientTo:    C.surface2,
                decimalPlaces:           0,
                color:                   () => C.primary,
                labelColor:              () => C.text3,
                propsForDots:            { r: '5', strokeWidth: '2', stroke: C.primary },
                propsForBackgroundLines: { stroke: C.border },
              }}
              bezier
              withShadow={false}
              style={{ borderRadius: 12 }}
            />
          </Card.Content>
        </Card>
      )}

      {/* Day-by-day */}
      {mode === 'seasonal' && forecast?.forecast && (
        <View style={{ marginTop: 8 }}>
          <Text variant="titleSmall" style={styles.dayLabel}>Day-by-Day Forecast</Text>
          <Surface style={styles.dayListSurface} elevation={1}>
            {forecast.forecast.map((pred, idx) => {
              const dt = TREND[pred.trend] || TREND.stable;
              return (
                <View key={pred.prediction_date}>
                  <View style={styles.dayRow}>
                    <Surface style={[styles.dayBadge, { backgroundColor: `${dt.color}20` }]} elevation={0}>
                      <Text variant="labelSmall" style={{ color: dt.color, fontWeight: '800' }}>D{idx + 1}</Text>
                    </Surface>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium" style={{ color: C.text }}>{pred.prediction_date}</Text>
                      <Text variant="labelSmall" style={{ color: C.text3, textTransform: 'capitalize' }}>
                        {pred.trend} · conf {pred.confidence_score?.toFixed(0) ?? '—'}%
                      </Text>
                    </View>
                    <Text variant="labelLarge" style={{ fontSize: 18, marginRight: 6 }}>{dt.emoji}</Text>
                    <Text variant="titleMedium" style={{ color: dt.color, fontWeight: '800', minWidth: 60, textAlign: 'right' }}>
                      ₹{pred.predicted_price.toFixed(0)}
                    </Text>
                  </View>
                  {idx < forecast.forecast.length - 1 && (
                    <Divider style={{ backgroundColor: C.border, marginLeft: 56 }} />
                  )}
                </View>
              );
            })}
          </Surface>
        </View>
      )}

      {!forecast && (
        <Text variant="bodyLarge" style={{ color: C.text3, textAlign: 'center', marginTop: 40 }}>
          No forecast data available.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg, padding: 24 },

  hero:      { backgroundColor: C.surface2, paddingTop: 28, paddingBottom: 24, paddingHorizontal: 24 },
  heroName:  { color: C.text, fontWeight: '900', letterSpacing: -0.5 },
  heroGrid:  { flexDirection: 'row' },
  heroCol:   { flex: 1, alignItems: 'center', paddingVertical: 12 },
  heroDivider: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border },
  heroLabel: { color: C.text3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },

  segmented: { marginHorizontal: 16, marginVertical: 14, borderColor: C.border },

  aiCard:    { marginHorizontal: 16, marginBottom: 12, backgroundColor: C.surface2, borderRadius: 20 },
  aiHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reasonBox: { backgroundColor: C.surface3, borderRadius: 12, padding: 12, marginTop: 14 },

  errCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: `${C.red}15`, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: `${C.red}30`,
  },

  chartCard: { marginHorizontal: 16, marginBottom: 14, backgroundColor: C.surface, borderRadius: 20 },

  dayLabel:       { color: C.text2, fontWeight: '700', marginHorizontal: 16, marginBottom: 8 },
  dayListSurface: { marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', backgroundColor: C.surface },
  dayRow:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  dayBadge:       { borderRadius: 10, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
