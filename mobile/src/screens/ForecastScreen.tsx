import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { api, WeeklyForecastResponse, AIPredictionResponse } from '../services/api';
import PriceCard from '../components/PriceCard';
import { C, TREND } from '../theme';

const W = Dimensions.get('window').width;

export default function ForecastScreen({ route }: any) {
  const { vegetable } = route.params as { vegetable: string };
  const label = vegetable.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const [forecast, setForecast] = useState<WeeklyForecastResponse | null>(null);
  const [aiPred, setAiPred]     = useState<AIPredictionResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMode, setAiMode]     = useState(false);
  const [aiError, setAiError]   = useState('');

  useEffect(() => {
    api.getWeeklyForecast(vegetable)
      .then(setForecast).catch(() => setForecast(null))
      .finally(() => setLoading(false));
  }, [vegetable]);

  const fetchAI = () => {
    if (aiPred) { setAiMode(true); return; }
    setAiLoading(true);
    setAiError('');
    api.aiPredict(vegetable)
      .then(d => { setAiPred(d); setAiMode(true); })
      .catch((e: any) => setAiError(e?.response?.data?.error || 'AI prediction failed — try again'))
      .finally(() => setAiLoading(false));
  };

  const chartData = forecast?.forecast?.length ? {
    labels: forecast.forecast.map(f => f.prediction_date.slice(5)),
    datasets: [{
      data: forecast.forecast.map(f => f.predicted_price),
      color: () => C.indigo,
      strokeWidth: 2,
    }, {
      data: forecast.forecast.map(f => f.confidence_lower),
      color: () => C.indigo + '44',
      strokeWidth: 1,
    }],
  } : null;

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={C.indigo} />
      <Text style={styles.loadingText}>Loading forecast...</Text>
    </View>
  );

  const today = forecast?.forecast?.[0];
  const t = today ? TREND[today.trend] || TREND.stable : TREND.stable;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <LinearGradient colors={['#0a1628', C.bg]} style={styles.hero}>
        <Text style={styles.heroName}>{label}</Text>
        <Text style={styles.heroSub}>7-Day Price Forecast</Text>
        {today && (
          <View style={styles.heroPrice}>
            <View style={styles.heroCol}>
              <Text style={styles.heroLabel}>Current</Text>
              <Text style={styles.heroVal}>₹{today.current_price?.toFixed(0) ?? '—'}</Text>
            </View>
            <View style={[styles.heroCol, styles.heroPrimary]}>
              <Text style={styles.heroLabel}>Tomorrow</Text>
              <Text style={[styles.heroValLg, { color: t.color }]}>
                ₹{today.predicted_price.toFixed(0)}
              </Text>
            </View>
            <View style={styles.heroCol}>
              <Text style={styles.heroLabel}>Trend</Text>
              <Text style={[styles.heroTrend, { color: t.color }]}>
                {today.trend_emoji} {today.trend}
              </Text>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* AI / Seasonal Toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, !aiMode && styles.toggleActive]}
          onPress={() => setAiMode(false)}
        >
          <Ionicons name="analytics-outline" size={14} color={!aiMode ? C.text : C.text3} />
          <Text style={[styles.toggleText, !aiMode && styles.toggleTextActive]}>Seasonal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, aiMode && styles.toggleActiveAI]}
          onPress={fetchAI}
          disabled={aiLoading}
        >
          {aiLoading
            ? <ActivityIndicator size="small" color={C.indigo} />
            : <Ionicons name="sparkles-outline" size={14} color={aiMode ? C.indigoLight : C.text3} />}
          <Text style={[styles.toggleText, aiMode && styles.toggleTextAI]}>
            {aiLoading ? 'Asking AI...' : 'AI Predict'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* AI Prediction card */}
      {aiMode && aiPred && (
        <View style={styles.aiCard}>
          <LinearGradient colors={['#312e8130', 'transparent']} style={StyleSheet.absoluteFill} />
          <View style={styles.aiHeader}>
            <Ionicons name="sparkles" size={16} color={C.indigoLight} />
            <Text style={styles.aiTitle}>GPT-4o Mini Prediction</Text>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI</Text>
            </View>
          </View>
          <Text style={[styles.aiPrice, { color: C.indigoLight }]}>
            ₹{aiPred.predicted_price.toFixed(0)}/kg
          </Text>
          <Text style={styles.aiRange}>
            Range: ₹{aiPred.confidence_lower.toFixed(0)} – ₹{aiPred.confidence_upper.toFixed(0)}
          </Text>
          {aiPred.reasoning ? (
            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>AI Reasoning</Text>
              <Text style={styles.reasonText}>{aiPred.reasoning}</Text>
            </View>
          ) : null}
        </View>
      )}

      {aiError ? <Text style={styles.errText}>{aiError}</Text> : null}

      {/* Chart */}
      {!aiMode && chartData && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Price Trend (7 days)</Text>
          <LineChart
            data={chartData}
            width={W - 32}
            height={180}
            chartConfig={{
              backgroundColor: C.card,
              backgroundGradientFrom: C.card,
              backgroundGradientTo: C.card,
              decimalPlaces: 0,
              color: () => C.indigo,
              labelColor: () => C.text3,
              propsForDots: { r: '4', strokeWidth: '2', stroke: C.indigo },
              propsForBackgroundLines: { stroke: C.border },
            }}
            bezier
            style={{ borderRadius: 16 }}
            withShadow={false}
          />
        </View>
      )}

      {/* 7-day cards */}
      {!aiMode && (
        <View style={{ marginBottom: 30 }}>
          <Text style={styles.dayLabel}>Day-by-Day Forecast</Text>
          {forecast?.forecast.map(pred => (
            <PriceCard key={pred.prediction_date} prediction={pred} />
          ))}
          {!forecast && (
            <Text style={styles.empty}>No forecast data available.</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg, gap: 12 },
  loadingText: { color: C.text2, fontSize: 14 },
  hero: { paddingTop: 30, paddingBottom: 24, paddingHorizontal: 20 },
  heroName: { fontSize: 26, fontWeight: '800', color: C.text },
  heroSub: { color: C.text3, fontSize: 13, marginTop: 4, marginBottom: 20 },
  heroPrice: { flexDirection: 'row', gap: 0 },
  heroCol: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  heroPrimary: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border },
  heroLabel: { color: C.text3, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  heroVal: { color: C.text2, fontSize: 20, fontWeight: '600' },
  heroValLg: { fontSize: 28, fontWeight: '800' },
  heroTrend: { fontSize: 15, fontWeight: '700', textTransform: 'capitalize' },
  toggleRow: {
    flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 16,
    backgroundColor: C.card, borderRadius: 14, padding: 4,
    borderWidth: 1, borderColor: C.border,
  },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  toggleActive: { backgroundColor: C.card2 },
  toggleActiveAI: { backgroundColor: '#312e8140' },
  toggleText: { color: C.text3, fontSize: 13, fontWeight: '600' },
  toggleTextActive: { color: C.text },
  toggleTextAI: { color: C.indigoLight },
  aiCard: {
    marginHorizontal: 16, marginBottom: 16, backgroundColor: C.card,
    borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#6366f130', overflow: 'hidden',
  },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  aiTitle: { color: C.indigoLight, fontSize: 14, fontWeight: '700', flex: 1 },
  aiBadge: { backgroundColor: '#6366f125', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  aiBadgeText: { color: C.indigo, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  aiPrice: { fontSize: 36, fontWeight: '800', marginBottom: 4 },
  aiRange: { color: C.text3, fontSize: 13, marginBottom: 12 },
  reasonBox: { backgroundColor: C.bg, borderRadius: 12, padding: 12 },
  reasonLabel: { color: C.text3, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  reasonText: { color: C.text2, fontSize: 13, lineHeight: 20 },
  errText: { color: C.red, textAlign: 'center', marginHorizontal: 16, marginBottom: 12, fontSize: 13 },
  chartCard: {
    marginHorizontal: 16, marginBottom: 16, backgroundColor: C.card,
    borderRadius: 20, padding: 16, borderWidth: 1, borderColor: C.border,
  },
  chartTitle: { color: C.text2, fontSize: 13, fontWeight: '600', marginBottom: 12 },
  dayLabel: { color: C.text2, fontSize: 13, fontWeight: '700', marginHorizontal: 16, marginBottom: 8, marginTop: 4 },
  empty: { color: C.text3, textAlign: 'center', marginTop: 40, fontSize: 15 },
});
