import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import {
  Surface, Text, Card, Chip, ActivityIndicator, Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';
import { C, TREND } from '../theme';

const VEGETABLES = [
  'tomato','onion','potato','garlic','ginger','green_chilli',
  'brinjal','cabbage','carrot','cauliflower','beans','ladies_finger',
];
const W = Dimensions.get('window').width;

export default function TrendsScreen() {
  const insets                    = useSafeAreaInsets();
  const [selected, setSelected]   = useState('tomato');
  const [forecast, setForecast]   = useState<any>(null);
  const [loading,  setLoading]    = useState(false);

  useEffect(() => {
    setLoading(true);
    setForecast(null);
    api.getWeeklyForecast(selected)
      .then(setForecast).catch(() => setForecast(null))
      .finally(() => setLoading(false));
  }, [selected]);

  const prices   = forecast?.forecast?.map((f: any) => f.predicted_price) ?? [];
  const labels   = forecast?.forecast?.map((f: any) => f.prediction_date.slice(5)) ?? [];
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const first    = forecast?.forecast?.[0];
  const t        = first ? TREND[first.trend as string] || TREND.stable : TREND.stable;

  const STAT_BOXES = [
    { label: '7-Day High', val: `₹${maxPrice.toFixed(0)}`, color: C.red   },
    { label: '7-Day Low',  val: `₹${minPrice.toFixed(0)}`, color: C.green },
    { label: 'Trend',      val: first?.trend ?? '—',        color: t.color },
    { label: 'Swing',      val: `₹${(maxPrice - minPrice).toFixed(0)}`, color: C.amber },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* App Bar */}
      <Surface style={styles.appbar} elevation={0}>
        <Text variant="headlineMedium" style={styles.appTitle}>Price Trends</Text>
        <Text variant="labelMedium" style={{ color: C.text3 }}>7-day forecast comparison</Text>
      </Surface>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Vegetable selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          {VEGETABLES.map(veg => (
            <Chip
              key={veg}
              selected={selected === veg}
              onPress={() => setSelected(veg)}
              style={[
                styles.vegChip,
                { backgroundColor: selected === veg ? `${C.primary}28` : C.surface },
              ]}
              textStyle={{
                color:      selected === veg ? C.primary : C.text2,
                fontWeight: selected === veg ? '700' : '400',
                fontSize:   13,
                textTransform: 'capitalize',
              }}
              showSelectedCheck={false}
              elevated={selected === veg}
            >
              {veg.replace(/_/g, ' ')}
            </Chip>
          ))}
        </ScrollView>

        {/* Loading */}
        {loading && (
          <View style={styles.loadCenter}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        )}

        {/* Stats row */}
        {!loading && prices.length > 0 && (
          <>
            <View style={styles.statsRow}>
              {STAT_BOXES.map(s => (
                <Surface key={s.label} style={styles.statBox} elevation={1}>
                  <Text variant="titleLarge" style={{ color: s.color, fontWeight: '800' }}>{s.val}</Text>
                  <Text variant="labelSmall" style={{ color: C.text3, marginTop: 4, textTransform: 'capitalize' }}>{s.label}</Text>
                </Surface>
              ))}
            </View>

            {/* Chart */}
            <Card style={styles.chartCard}>
              <Card.Content>
                <Text variant="titleSmall" style={{ color: C.text2, fontWeight: '700', marginBottom: 12, textTransform: 'capitalize' }}>
                  {selected.replace(/_/g, ' ')} — Next 7 Days
                </Text>
                <LineChart
                  data={{ labels, datasets: [{ data: prices, strokeWidth: 2 }] }}
                  width={W - 80}
                  height={190}
                  chartConfig={{
                    backgroundColor:         C.surface2,
                    backgroundGradientFrom:  C.surface2,
                    backgroundGradientTo:    C.surface2,
                    decimalPlaces:           0,
                    color:                   () => t.color,
                    labelColor:              () => C.text3,
                    propsForDots:            { r: '5', strokeWidth: '2', stroke: t.color },
                    propsForBackgroundLines: { stroke: C.border },
                  }}
                  bezier
                  withShadow={false}
                  style={{ borderRadius: 12 }}
                />
              </Card.Content>
            </Card>

            {/* Day list */}
            <Text variant="titleSmall" style={styles.dayLabel}>Day-by-Day</Text>
            <Surface style={styles.dayListSurface} elevation={1}>
              {forecast.forecast.map((f: any, idx: number) => {
                const dt = TREND[f.trend as string] || TREND.stable;
                return (
                  <View key={f.prediction_date}>
                    <View style={styles.dayRow}>
                      <Surface style={[styles.dayBadge, { backgroundColor: `${dt.color}20` }]} elevation={0}>
                        <Text variant="labelSmall" style={{ color: dt.color, fontWeight: '800' }}>D{idx + 1}</Text>
                      </Surface>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyMedium" style={{ color: C.text }}>{f.prediction_date}</Text>
                        <Text variant="labelSmall" style={{ color: C.text3 }}>
                          ₹{f.confidence_lower?.toFixed(0)} – ₹{f.confidence_upper?.toFixed(0)}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 18, marginRight: 8 }}>{dt.emoji}</Text>
                      <Text variant="titleMedium" style={{ color: dt.color, fontWeight: '800', minWidth: 60, textAlign: 'right' }}>
                        ₹{f.predicted_price.toFixed(0)}
                      </Text>
                    </View>
                    {idx < forecast.forecast.length - 1 && (
                      <Divider style={{ backgroundColor: C.border, marginLeft: 54 }} />
                    )}
                  </View>
                );
              })}
            </Surface>
          </>
        )}

        {!loading && !forecast && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="chart-line-variant" size={56} color={C.text3} />
            <Text variant="bodyLarge" style={{ color: C.text3, marginTop: 12 }}>No forecast data available</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  appbar:    { backgroundColor: C.surface, paddingHorizontal: 20, paddingBottom: 16, paddingTop: 12 },
  appTitle:  { color: C.text, fontWeight: '800' },

  chipScroll: { marginVertical: 12 },
  chipRow:    { paddingHorizontal: 16, gap: 8 },
  vegChip:    { borderRadius: 20 },

  loadCenter: { alignItems: 'center', marginTop: 60 },

  statsRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 14, gap: 8 },
  statBox:  {
    flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8,
    borderRadius: 16, backgroundColor: C.surface,
  },

  chartCard: { marginHorizontal: 16, marginBottom: 14, backgroundColor: C.surface, borderRadius: 20 },

  dayLabel:       { color: C.text2, fontWeight: '700', marginHorizontal: 16, marginBottom: 8 },
  dayListSurface: { marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', backgroundColor: C.surface },
  dayRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16 },
  dayBadge:       { borderRadius: 10, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  emptyState: { alignItems: 'center', marginTop: 80 },
});
