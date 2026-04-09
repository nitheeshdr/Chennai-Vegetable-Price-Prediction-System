import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import { api } from '../services/api';
import { C, TREND } from '../theme';

const VEGETABLES = [
  'tomato','onion','potato','garlic','ginger','green_chilli',
  'brinjal','cabbage','carrot','cauliflower','beans','ladies_finger',
];
const W = Dimensions.get('window').width;

export default function TrendsScreen() {
  const [selected, setSelected] = useState('tomato');
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getWeeklyForecast(selected)
      .then(setForecast).catch(() => setForecast(null))
      .finally(() => setLoading(false));
  }, [selected]);

  const prices   = forecast?.forecast?.map((f: any) => f.predicted_price) ?? [];
  const labels   = forecast?.forecast?.map((f: any) => f.prediction_date.slice(5)) ?? [];
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const first    = forecast?.forecast?.[0];
  const t        = first ? TREND[first.trend as keyof typeof TREND] || TREND.stable : TREND.stable;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#0a1628', C.bg]} style={styles.hero}>
        <Text style={styles.heroTitle}>Price Trends</Text>
        <Text style={styles.heroSub}>7-day forecast comparison</Text>
      </LinearGradient>

      {/* Vegetable Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
        {VEGETABLES.map(veg => (
          <TouchableOpacity key={veg} onPress={() => setSelected(veg)} activeOpacity={0.7}>
            <LinearGradient
              colors={selected === veg ? ['#6366f1', '#4f46e5'] : [C.card, C.card]}
              style={[styles.chip, selected === veg && styles.chipActive]}
            >
              <Text style={[styles.chipText, selected === veg && styles.chipTextActive]}>
                {veg.replace(/_/g, ' ')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading && (
        <View style={styles.loadWrap}>
          <ActivityIndicator size="large" color={C.indigo} />
        </View>
      )}

      {!loading && forecast && prices.length > 0 && (
        <>
          <View style={styles.statsRow}>
            {[
              { label: 'High', val: `₹${maxPrice.toFixed(0)}`, color: C.red },
              { label: 'Low',  val: `₹${minPrice.toFixed(0)}`, color: C.green },
              { label: 'Trend', val: first?.trend ?? '—', color: t.color },
              { label: 'Swing', val: `₹${(maxPrice - minPrice).toFixed(0)}`, color: C.amber },
            ].map(s => (
              <View key={s.label} style={styles.statBox}>
                <Text style={[styles.statNum, { color: s.color }]}>{s.val}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>
              {selected.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} — Next 7 Days
            </Text>
            <LineChart
              data={{ labels, datasets: [{ data: prices, strokeWidth: 2 }] }}
              width={W - 64}
              height={180}
              chartConfig={{
                backgroundColor: C.card,
                backgroundGradientFrom: C.card,
                backgroundGradientTo: C.card,
                decimalPlaces: 0,
                color: () => t.color,
                labelColor: () => C.text3,
                propsForDots: { r: '5', strokeWidth: '2', stroke: t.color },
                propsForBackgroundLines: { stroke: C.border },
              }}
              bezier withShadow={false}
              style={{ borderRadius: 12 }}
            />
          </View>

          <View style={styles.dayList}>
            {forecast.forecast.map((f: any, i: number) => {
              const dt = TREND[f.trend as keyof typeof TREND] || TREND.stable;
              return (
                <View key={f.prediction_date} style={styles.dayRow}>
                  <View style={styles.dayNum}><Text style={styles.dayNumText}>D{i + 1}</Text></View>
                  <Text style={styles.dayDate}>{f.prediction_date}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={styles.dayEmoji}>{f.trend_emoji}</Text>
                  <Text style={[styles.dayPrice, { color: dt.color }]}>₹{f.predicted_price.toFixed(0)}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}

      {!loading && !forecast && (
        <Text style={styles.empty}>No forecast data available.</Text>
      )}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  hero: { paddingTop: 20, paddingBottom: 20, paddingHorizontal: 20 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: C.text },
  heroSub: { color: C.text3, fontSize: 13, marginTop: 4 },
  chipScroll: { marginVertical: 12 },
  chipRow: { paddingHorizontal: 16, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.border },
  chipActive: { borderColor: 'transparent' },
  chipText: { color: C.text2, fontSize: 13, fontWeight: '500', textTransform: 'capitalize' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  loadWrap: { alignItems: 'center', marginTop: 60 },
  statsRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 14, gap: 8 },
  statBox: { flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  statNum: { fontSize: 18, fontWeight: '800' },
  statLabel: { color: C.text3, fontSize: 10, marginTop: 2 },
  chartCard: { marginHorizontal: 16, marginBottom: 14, backgroundColor: C.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: C.border },
  chartTitle: { color: C.text2, fontSize: 13, fontWeight: '600', marginBottom: 12 },
  dayList: { marginHorizontal: 16, backgroundColor: C.card, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  dayNum: { backgroundColor: C.card2, borderRadius: 8, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  dayNumText: { color: C.text3, fontSize: 11, fontWeight: '700' },
  dayDate: { color: C.text2, fontSize: 13 },
  dayEmoji: { fontSize: 16 },
  dayPrice: { fontSize: 16, fontWeight: '700', minWidth: 55, textAlign: 'right' },
  empty: { color: C.text3, textAlign: 'center', marginTop: 60, fontSize: 15 },
});
