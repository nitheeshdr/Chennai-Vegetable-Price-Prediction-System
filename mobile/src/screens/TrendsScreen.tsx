import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Surface, Text, Card, Chip, ActivityIndicator, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';
import { C, SP, SHAPE, TREND } from '../theme';

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

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* ── Top App Bar ── */}
      <Surface style={s.topBar} elevation={0}>
        <Text variant="headlineMedium" style={s.appTitle}>Price Trends</Text>
        <Text variant="labelMedium" style={{ color: C.text3, marginTop: SP.xs }}>7-day forecast comparison</Text>
      </Surface>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: SP.xxxl }}>

        {/* ── Vegetable selector ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginVertical: SP.md }}
          contentContainerStyle={{ paddingHorizontal: SP.lg, gap: SP.sm }}
        >
          {VEGETABLES.map(veg => (
            <Chip
              key={veg}
              selected={selected === veg}
              onPress={() => setSelected(veg)}
              showSelectedCheck={false}
              elevated={selected === veg}
              style={[s.chip, { backgroundColor: selected === veg ? `${C.primary}28` : C.surface }]}
              textStyle={{
                color:      selected === veg ? C.primary : C.text2,
                fontWeight: selected === veg ? '700' : '400',
                fontSize: 13,
                textTransform: 'capitalize',
              }}
            >
              {veg.replace(/_/g, ' ')}
            </Chip>
          ))}
        </ScrollView>

        {/* ── Loading ── */}
        {loading && (
          <View style={{ alignItems: 'center', marginTop: SP.huge }}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        )}

        {/* ── Stats row ── */}
        {!loading && prices.length > 0 && (
          <>
            <View style={s.statsRow}>
              {[
                { label: '7-Day High', val: `₹${maxPrice.toFixed(0)}`, color: C.red   },
                { label: '7-Day Low',  val: `₹${minPrice.toFixed(0)}`, color: C.green },
                { label: 'Trend',      val: first?.trend ?? '—',        color: t.color, capitalize: true },
                { label: 'Swing',      val: `₹${(maxPrice-minPrice).toFixed(0)}`, color: C.amber },
              ].map(stat => (
                <Surface key={stat.label} style={s.statBox} elevation={1}>
                  <Text variant="titleLarge" style={{ color: stat.color, fontWeight: '800', textTransform: stat.capitalize ? 'capitalize' : 'none' as any }}>
                    {stat.val}
                  </Text>
                  <Text variant="labelSmall" style={{ color: C.text3, marginTop: SP.xs }}>{stat.label}</Text>
                </Surface>
              ))}
            </View>

            {/* ── Chart ── */}
            <Card style={s.chartCard}>
              <Card.Content>
                <Text variant="titleSmall" style={{ color: C.text2, fontWeight: '700', marginBottom: SP.md, textTransform: 'capitalize' }}>
                  {selected.replace(/_/g, ' ')} — Next 7 Days
                </Text>
                <LineChart
                  data={{ labels, datasets: [{ data: prices, strokeWidth: 2 }] }}
                  width={W - SP.lg * 2 - SP.xl * 2}
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
                  style={{ borderRadius: SHAPE.md }}
                />
              </Card.Content>
            </Card>

            {/* ── Day list ── */}
            <Text variant="titleSmall" style={s.dayLabel}>Day-by-Day</Text>
            <Surface style={s.dayList} elevation={1}>
              {forecast.forecast.map((f: any, idx: number) => {
                const dt = TREND[f.trend as string] || TREND.stable;
                return (
                  <View key={f.prediction_date}>
                    <View style={s.dayRow}>
                      <Surface style={[s.dayBadge, { backgroundColor: `${dt.color}20` }]} elevation={0}>
                        <Text variant="labelSmall" style={{ color: dt.color, fontWeight: '800' }}>D{idx + 1}</Text>
                      </Surface>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text variant="bodyMedium" style={{ color: C.text }}>{f.prediction_date}</Text>
                        <Text variant="labelSmall" style={{ color: C.text3 }}>
                          ₹{f.confidence_lower?.toFixed(0)} – ₹{f.confidence_upper?.toFixed(0)}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 18, marginRight: SP.sm }}>{dt.emoji}</Text>
                      <Text variant="titleMedium" style={{ color: dt.color, fontWeight: '800', minWidth: 62, textAlign: 'right' }}>
                        ₹{f.predicted_price.toFixed(0)}
                      </Text>
                    </View>
                    {idx < forecast.forecast.length - 1 && (
                      <Divider style={{ backgroundColor: C.border, marginLeft: SP.xl + SP.xxxl }} />
                    )}
                  </View>
                );
              })}
            </Surface>
          </>
        )}

        {!loading && !forecast && (
          <View style={s.empty}>
            <MaterialCommunityIcons name="chart-line-variant" size={56} color={C.text3} />
            <Text variant="bodyLarge" style={{ color: C.text3, marginTop: SP.md }}>No forecast data available</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:     { flex: 1, backgroundColor: C.bg },
  topBar:   { backgroundColor: C.surface, paddingHorizontal: SP.lg, paddingTop: SP.md, paddingBottom: SP.lg },
  appTitle: { color: C.text, fontWeight: '800' },

  chip: { borderRadius: SHAPE.full },

  statsRow: { flexDirection: 'row', marginHorizontal: SP.lg, marginBottom: SP.md, gap: SP.sm },
  statBox:  { flex: 1, alignItems: 'center', paddingVertical: SP.lg, borderRadius: SHAPE.lg, backgroundColor: C.surface, gap: SP.xs },

  chartCard: { marginHorizontal: SP.lg, marginBottom: SP.md, backgroundColor: C.surface, borderRadius: SHAPE.xl },

  dayLabel: { color: C.text2, fontWeight: '700', marginHorizontal: SP.lg, marginBottom: SP.sm },
  dayList:  { marginHorizontal: SP.lg, borderRadius: SHAPE.xl, overflow: 'hidden', backgroundColor: C.surface },
  dayRow:   { flexDirection: 'row', alignItems: 'center', gap: SP.md, paddingVertical: 15, paddingHorizontal: SP.lg },
  dayBadge: { borderRadius: SHAPE.md, width: 38, height: 38, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  empty: { alignItems: 'center', paddingVertical: SP.huge },
});
