import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import {
  Surface, Text, Card, Chip, ActivityIndicator,
  SegmentedButtons, Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { api, WeeklyForecastResponse, AIPredictionResponse } from '../services/api';
import { C, SP, SHAPE, TREND } from '../theme';

const W = Dimensions.get('window').width;

export default function ForecastScreen({ route }: any) {
  const { vegetable } = route.params as { vegetable: string };
  const label = vegetable.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

  const [forecast,   setForecast]   = useState<WeeklyForecastResponse | null>(null);
  const [bestPred,   setBestPred]   = useState<AIPredictionResponse | null>(null);
  const [aiPred,     setAiPred]     = useState<AIPredictionResponse | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [aiLoading,  setAiLoading]  = useState(false);
  const [mode,       setMode]       = useState('seasonal');
  const [aiError,    setAiError]    = useState('');

  useEffect(() => {
    setLoading(true);
    setBestPred(null);
    setForecast(null);
    setAiPred(null);
    // Fetch best single prediction (checks Supabase for AI price first)
    // and weekly seasonal chart in parallel
    Promise.all([
      api.predict(vegetable).then(p => setBestPred(p as AIPredictionResponse)).catch(() => {}),
      api.getWeeklyForecast(vegetable).then(setForecast).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [vegetable]);

  const fetchAI = (val: string) => {
    setMode(val);
    if (val === 'seasonal') return;
    // If bestPred is already from AI (not seasonal model), use it directly
    if (bestPred && bestPred.model_name && !bestPred.model_name.startsWith('seasonal')) {
      setAiPred(bestPred);
      return;
    }
    if (aiPred) return;
    setAiLoading(true);
    setAiError('');
    api.aiPredict(vegetable)
      .then(d => { setAiPred(d); setBestPred(d); })
      .catch((e: any) => setAiError(e?.response?.data?.error || 'AI prediction failed — try again'))
      .finally(() => setAiLoading(false));
  };

  // Hero uses best available: AI from Supabase → else seasonal forecast day 1
  const heroData = bestPred ?? forecast?.forecast?.[0];
  const t        = heroData ? TREND[heroData.trend] || TREND.stable : TREND.stable;

  const chartData = forecast?.forecast?.length ? {
    labels:   forecast.forecast.map(f => f.prediction_date.slice(5)),
    datasets: [{ data: forecast.forecast.map(f => f.predicted_price), strokeWidth: 2 }],
  } : null;

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={C.primary} />
      <Text variant="bodyMedium" style={{ color: C.text3, marginTop: SP.md }}>Loading forecast…</Text>
    </View>
  );

  return (
    <ScrollView style={s.root} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: SP.xxxl }}>

      {/* ── Hero ── */}
      <Surface style={s.hero} elevation={2}>
        <Text variant="displaySmall" style={s.heroName}>{label}</Text>
        <Text variant="labelLarge" style={{ color: C.text3, marginTop: SP.xs, marginBottom: SP.xxl }}>
          7-Day Price Forecast
        </Text>
        {heroData && (
          <View style={s.heroGrid}>
            <View style={s.heroCol}>
              <Text variant="labelSmall" style={s.heroLabel}>TODAY</Text>
              <Text variant="headlineSmall" style={{ color: C.text2, fontWeight: '700' }}>
                ₹{heroData.current_price?.toFixed(0) ?? '—'}
              </Text>
            </View>
            <Divider style={s.heroDividerV} />
            <View style={[s.heroCol, { flex: 1.2 }]}>
              <Text variant="labelSmall" style={s.heroLabel}>TOMORROW</Text>
              <Text variant="displaySmall" style={{ color: t.color, fontWeight: '900' }}>
                ₹{heroData.predicted_price.toFixed(0)}
              </Text>
            </View>
            <Divider style={s.heroDividerV} />
            <View style={s.heroCol}>
              <Text variant="labelSmall" style={s.heroLabel}>TREND</Text>
              <Text variant="titleLarge" style={{ color: t.color, fontWeight: '800' }}>
                {t.emoji} {heroData.trend}
              </Text>
            </View>
          </View>
        )}
      </Surface>

      {/* ── Toggle ── */}
      <SegmentedButtons
        value={mode}
        onValueChange={fetchAI}
        style={s.segmented}
        buttons={[
          {
            value: 'seasonal',
            label: 'Seasonal',
            icon:  'chart-line',
            style: { backgroundColor: mode === 'seasonal' ? `${C.primary}20` : C.surface },
          },
          {
            value:    'ai',
            label:    aiLoading ? 'Asking AI…' : 'AI Predict',
            icon:     'brain',
            style:    { backgroundColor: mode === 'ai' ? `${C.primary}20` : C.surface },
            disabled: aiLoading,
          },
        ]}
      />

      {/* ── AI Loading ── */}
      {mode === 'ai' && aiLoading && (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text variant="bodyMedium" style={{ color: C.text3, marginTop: SP.md }}>Asking AI model…</Text>
        </View>
      )}

      {/* ── AI Error ── */}
      {mode === 'ai' && !!aiError && !aiLoading && (
        <Surface style={s.errCard} elevation={0}>
          <MaterialCommunityIcons name="alert-circle-outline" size={20} color={C.red} />
          <Text variant="bodyMedium" style={{ color: C.red, flex: 1 }}>{aiError}</Text>
        </Surface>
      )}

      {/* ── AI Result ── */}
      {mode === 'ai' && aiPred && !aiLoading && (
        <Card style={s.aiCard}>
          <Card.Content style={{ gap: SP.sm }}>
            <View style={s.aiHeader}>
              <MaterialCommunityIcons name="brain" size={18} color={C.primary} />
              <Text variant="titleMedium" style={{ color: C.primary, fontWeight: '700', flex: 1 }}>
                AI Prediction
              </Text>
              <Chip
                compact
                style={{ backgroundColor: `${C.primary}25` }}
                textStyle={{ color: C.primary, fontSize: 10, fontWeight: '800' }}
              >
                AI
              </Chip>
            </View>

            <Text variant="displaySmall" style={{ color: C.primary, fontWeight: '900', marginTop: SP.xs }}>
              ₹{aiPred.predicted_price.toFixed(0)}
              <Text variant="titleMedium" style={{ color: C.text3, fontWeight: '400' }}>/kg</Text>
            </Text>
            <Text variant="bodySmall" style={{ color: C.text3 }}>
              Range: ₹{aiPred.confidence_lower.toFixed(0)} – ₹{aiPred.confidence_upper.toFixed(0)}
            </Text>

            {aiPred.reasoning ? (
              <Surface style={s.reasonBox} elevation={0}>
                <Text variant="labelSmall" style={{ color: C.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SP.sm }}>
                  AI Reasoning
                </Text>
                <Text variant="bodyMedium" style={{ color: C.text2, lineHeight: 22 }}>
                  {aiPred.reasoning}
                </Text>
              </Surface>
            ) : null}

            <Text variant="labelSmall" style={{ color: C.text3 }}>Model: {aiPred.model_name}</Text>
          </Card.Content>
        </Card>
      )}

      {/* ── Chart ── */}
      {mode === 'seasonal' && chartData && (
        <Card style={s.chartCard}>
          <Card.Content>
            <Text variant="titleSmall" style={{ color: C.text2, fontWeight: '700', marginBottom: SP.md }}>
              Price Trend — 7 Days
            </Text>
            <LineChart
              data={chartData}
              width={W - SP.lg * 2 - SP.xl * 2}
              height={188}
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
              style={{ borderRadius: SHAPE.md }}
            />
          </Card.Content>
        </Card>
      )}

      {/* ── Day list ── */}
      {mode === 'seasonal' && forecast?.forecast && (
        <View>
          <Text variant="titleSmall" style={s.sectionLabel}>Day-by-Day Forecast</Text>
          <Surface style={s.dayList} elevation={1}>
            {forecast.forecast.map((pred, idx) => {
              const dt = TREND[pred.trend] || TREND.stable;
              return (
                <View key={pred.prediction_date}>
                  <View style={s.dayRow}>
                    <Surface style={[s.dayBadge, { backgroundColor: `${dt.color}20` }]} elevation={0}>
                      <Text variant="labelSmall" style={{ color: dt.color, fontWeight: '800' }}>D{idx + 1}</Text>
                    </Surface>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium" style={{ color: C.text }}>{pred.prediction_date}</Text>
                      <Text variant="labelSmall" style={{ color: C.text3, textTransform: 'capitalize', marginTop: 2 }}>
                        {pred.trend}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 18, marginRight: SP.sm }}>{dt.emoji}</Text>
                    <Text variant="titleMedium" style={{ color: dt.color, fontWeight: '800', minWidth: 62, textAlign: 'right' }}>
                      ₹{pred.predicted_price.toFixed(0)}
                    </Text>
                  </View>
                  {idx < forecast.forecast.length - 1 && (
                    <Divider style={{ backgroundColor: C.border, marginLeft: SP.xxxl + SP.xl }} />
                  )}
                </View>
              );
            })}
          </Surface>
        </View>
      )}

      {!forecast && (
        <View style={s.empty}>
          <MaterialCommunityIcons name="chart-line-variant" size={56} color={C.text3} />
          <Text variant="bodyLarge" style={{ color: C.text3, marginTop: SP.md }}>No forecast data available.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', padding: SP.xxxl, flex: 1, justifyContent: 'center', backgroundColor: C.bg },
  empty:  { alignItems: 'center', paddingVertical: SP.huge },

  hero:       { backgroundColor: C.surface2, paddingTop: SP.xxl, paddingBottom: SP.xxl, paddingHorizontal: SP.xl },
  heroName:   { color: C.text, fontWeight: '900', letterSpacing: -0.5 },
  heroGrid:   { flexDirection: 'row', alignItems: 'center' },
  heroCol:    { flex: 1, alignItems: 'center', paddingVertical: SP.md, gap: SP.sm },
  heroDividerV: { width: 1, height: 56, backgroundColor: C.border },
  heroLabel:  { color: C.text3, letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 10 },

  segmented: { marginHorizontal: SP.lg, marginTop: SP.lg, marginBottom: SP.md, borderColor: C.border },

  errCard: {
    flexDirection: 'row', alignItems: 'center', gap: SP.md,
    marginHorizontal: SP.lg, marginBottom: SP.md,
    backgroundColor: `${C.red}12`, borderRadius: SHAPE.md,
    padding: SP.lg, borderWidth: 1, borderColor: `${C.red}30`,
  },

  aiCard:    { marginHorizontal: SP.lg, marginBottom: SP.md, backgroundColor: C.surface, borderRadius: SHAPE.xl },
  aiHeader:  { flexDirection: 'row', alignItems: 'center', gap: SP.sm },
  reasonBox: { backgroundColor: C.surface2, borderRadius: SHAPE.md, padding: SP.lg, marginTop: SP.sm },

  chartCard: { marginHorizontal: SP.lg, marginBottom: SP.md, backgroundColor: C.surface, borderRadius: SHAPE.xl },

  sectionLabel: { color: C.text2, fontWeight: '700', marginHorizontal: SP.lg, marginBottom: SP.sm, marginTop: SP.sm },
  dayList:   { marginHorizontal: SP.lg, borderRadius: SHAPE.xl, overflow: 'hidden', backgroundColor: C.surface },
  dayRow:    { flexDirection: 'row', alignItems: 'center', gap: SP.md, paddingVertical: 15, paddingHorizontal: SP.lg },
  dayBadge:  { borderRadius: SHAPE.md, width: 38, height: 38, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
