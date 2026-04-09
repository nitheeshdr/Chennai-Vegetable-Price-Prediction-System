import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, TextInput } from 'react-native';
import { Surface, Text, Card, Chip, ActivityIndicator, Divider, SegmentedButtons } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, PriceHistoryRecord } from '../services/api';
import { useC, useTREND } from '../context/ThemeContext';
import { SP, SHAPE } from '../theme';

const ALL_VEGETABLES = [
  'tomato','onion','potato','garlic','ginger','green_chilli',
  'brinjal','cabbage','carrot','cauliflower','beans','ladies_finger',
  'bitter_gourd','bottle_gourd','coriander','drumstick','raw_banana','tapioca',
];
const W = Dimensions.get('window').width;

function HistoryChart({ vegetable }: { vegetable: string }) {
  const C = useC();
  const [history, setHistory] = useState<PriceHistoryRecord[]>([]);
  const [loading, setLoading]  = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getPriceHistory(vegetable, 30)
      .then(r => setHistory(r.history))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [vegetable]);

  if (loading) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: SP.huge }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (!history.length) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: SP.huge }}>
        <MaterialCommunityIcons name="chart-timeline-variant" size={48} color={C.text3} />
        <Text variant="bodyMedium" style={{ color: C.text3, marginTop: SP.md }}>No historical data available</Text>
      </View>
    );
  }

  const prices   = history.map(h => h.modal_price);
  const labels   = history.map((h, i) => i % 7 === 0 ? h.date.slice(5) : '');
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const avg      = prices.reduce((a, b) => a + b, 0) / prices.length;
  const latest   = prices[prices.length - 1];
  const oldest   = prices[0];
  const changePct = (((latest - oldest) / oldest) * 100).toFixed(1);
  const trendColor = Number(changePct) > 0 ? C.red : Number(changePct) < 0 ? C.green : C.amber;

  return (
    <>
      {/* Stats */}
      <View style={[hs.statsRow, { marginHorizontal: SP.lg, marginBottom: SP.md }]}>
        {[
          { label: '30-Day High', val: `₹${maxPrice.toFixed(0)}`, color: C.red   },
          { label: '30-Day Low',  val: `₹${minPrice.toFixed(0)}`, color: C.green },
          { label: 'Average',     val: `₹${avg.toFixed(0)}`,      color: C.amber },
          { label: '30D Change',  val: `${Number(changePct) > 0 ? '+' : ''}${changePct}%`, color: trendColor },
        ].map(stat => (
          <Surface key={stat.label} style={[hs.statBox, { backgroundColor: C.surface }]} elevation={1}>
            <Text variant="titleLarge" style={{ color: stat.color, fontWeight: '800' }}>{stat.val}</Text>
            <Text variant="labelSmall" style={{ color: C.text3, marginTop: SP.xs, textAlign: 'center' }}>{stat.label}</Text>
          </Surface>
        ))}
      </View>

      {/* Chart */}
      <Card style={[hs.chartCard, { backgroundColor: C.surface }]}>
        <Card.Content>
          <Text variant="titleSmall" style={{ color: C.text2, fontWeight: '700', marginBottom: SP.md, textTransform: 'capitalize' }}>
            {vegetable.replace(/_/g, ' ')} — Last 30 Days
          </Text>
          <LineChart
            data={{ labels, datasets: [{ data: prices, strokeWidth: 2 }] }}
            width={W - SP.lg * 2 - SP.xl * 2} height={190}
            chartConfig={{
              backgroundColor: C.surface2, backgroundGradientFrom: C.surface2,
              backgroundGradientTo: C.surface2, decimalPlaces: 0,
              color: () => trendColor, labelColor: () => C.text3,
              propsForDots: { r: '3', strokeWidth: '2', stroke: trendColor },
              propsForBackgroundLines: { stroke: C.border },
            }}
            bezier withShadow={false} style={{ borderRadius: SHAPE.md }}
          />
        </Card.Content>
      </Card>

      {/* Day list */}
      <Text variant="titleSmall" style={[hs.dayLabel, { color: C.text2 }]}>Daily Records</Text>
      <Surface style={[hs.dayList, { backgroundColor: C.surface }]} elevation={1}>
        {[...history].reverse().slice(0, 14).map((h, idx, arr) => (
          <View key={h.date}>
            <View style={hs.dayRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyMedium" style={{ color: C.text }}>{h.date}</Text>
                {h.market_name && (
                  <Text variant="labelSmall" style={{ color: C.text3 }}>📍 {h.market_name}</Text>
                )}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Text variant="titleMedium" style={{ color: C.text, fontWeight: '700' }}>
                  ₹{h.modal_price.toFixed(0)}/kg
                </Text>
                {h.min_price != null && h.max_price != null && (
                  <Text variant="labelSmall" style={{ color: C.text3 }}>
                    ₹{h.min_price.toFixed(0)} – ₹{h.max_price.toFixed(0)}
                  </Text>
                )}
              </View>
            </View>
            {idx < arr.length - 1 && (
              <Divider style={{ backgroundColor: C.border }} />
            )}
          </View>
        ))}
      </Surface>
    </>
  );
}

export default function TrendsScreen() {
  const C     = useC();
  const TREND = useTREND();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState('tomato');
  const [forecast, setForecast] = useState<any>(null);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState('');
  const [tab,      setTab]      = useState<'forecast' | 'history'>('forecast');

  const vegetables = search.trim()
    ? ALL_VEGETABLES.filter(v => v.replace(/_/g,' ').includes(search.toLowerCase()))
    : ALL_VEGETABLES;

  useEffect(() => {
    if (tab !== 'forecast') return;
    setLoading(true); setForecast(null);
    api.getWeeklyForecast(selected)
      .then(setForecast).catch(() => setForecast(null))
      .finally(() => setLoading(false));
  }, [selected, tab]);

  const prices   = forecast?.forecast?.map((f: any) => f.predicted_price) ?? [];
  const labels   = forecast?.forecast?.map((f: any) => f.prediction_date.slice(5)) ?? [];
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const first    = forecast?.forecast?.[0];
  const t        = first ? TREND[first.trend as string] || TREND.stable : TREND.stable;

  return (
    <View style={[s.root, { paddingTop: insets.top, backgroundColor: C.bg }]}>
      <Surface style={[s.topBar, { backgroundColor: C.surface }]} elevation={0}>
        <Text variant="headlineMedium" style={[s.appTitle, { color: C.text }]}>Price Trends</Text>
        <Text variant="labelMedium"    style={{ color: C.text3, marginTop: SP.xs }}>Forecast & price history</Text>
      </Surface>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: SP.xxxl }}>

        {/* ── Search ── */}
        <View style={[s.searchWrap, { backgroundColor: C.surface2, borderColor: C.border }]}>
          <MaterialCommunityIcons name="magnify" size={18} color={C.text3} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search vegetables…"
            placeholderTextColor={C.text3}
            style={[s.searchInput, { color: C.text }]}
          />
          {!!search && (
            <MaterialCommunityIcons name="close-circle" size={16} color={C.text3}
              onPress={() => setSearch('')} />
          )}
        </View>

        {/* ── Vegetable chips ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ marginBottom: SP.md }}
          contentContainerStyle={{ paddingHorizontal: SP.lg, gap: SP.sm }}>
          {vegetables.map(veg => (
            <Chip key={veg} selected={selected === veg} onPress={() => setSelected(veg)}
              showSelectedCheck={false} elevated={selected === veg}
              style={[s.chip, { backgroundColor: selected === veg ? `${C.primary}28` : C.surface }]}
              textStyle={{ color: selected === veg ? C.primary : C.text2, fontWeight: selected === veg ? '700' : '400', fontSize: 13, textTransform: 'capitalize' }}>
              {veg.replace(/_/g, ' ')}
            </Chip>
          ))}
        </ScrollView>

        {/* ── Tabs ── */}
        <SegmentedButtons
          value={tab}
          onValueChange={(v: string) => setTab(v as 'forecast' | 'history')}
          style={{ marginHorizontal: SP.lg, marginBottom: SP.md }}
          buttons={[
            { value: 'forecast', label: '7-Day Forecast', icon: 'chart-line',
              style: { backgroundColor: tab === 'forecast' ? `${C.primary}20` : C.surface } },
            { value: 'history',  label: 'Price History',  icon: 'history',
              style: { backgroundColor: tab === 'history'  ? `${C.primary}20` : C.surface } },
          ]}
        />

        {/* ── Forecast tab ── */}
        {tab === 'forecast' && (
          <>
            {loading && (
              <View style={{ alignItems: 'center', marginTop: SP.huge }}>
                <ActivityIndicator size="large" color={C.primary} />
              </View>
            )}

            {!loading && prices.length > 0 && (
              <>
                {/* Stats */}
                <View style={s.statsRow}>
                  {[
                    { label: '7-Day High', val: `₹${maxPrice.toFixed(0)}`,             color: C.red   },
                    { label: '7-Day Low',  val: `₹${minPrice.toFixed(0)}`,             color: C.green },
                    { label: 'Trend',      val: first?.trend ?? '—',                    color: t.color, capitalize: true },
                    { label: 'Swing',      val: `₹${(maxPrice - minPrice).toFixed(0)}`, color: C.amber },
                  ].map(stat => (
                    <Surface key={stat.label} style={[s.statBox, { backgroundColor: C.surface }]} elevation={1}>
                      <Text variant="titleLarge" style={{ color: stat.color, fontWeight: '800', textTransform: stat.capitalize ? 'capitalize' : 'none' as any }}>
                        {stat.val}
                      </Text>
                      <Text variant="labelSmall" style={{ color: C.text3, marginTop: SP.xs }}>{stat.label}</Text>
                    </Surface>
                  ))}
                </View>

                {/* Model badge */}
                {first?.model_name && (
                  <Text variant="labelSmall" style={{ color: C.text3, textAlign: 'center', marginBottom: SP.sm }}>
                    ⚡ {first.model_name.startsWith('seasonal') ? 'Seasonal ML' : `AI · ${first.model_name}`}
                  </Text>
                )}

                {/* Chart */}
                <Card style={[s.chartCard, { backgroundColor: C.surface }]}>
                  <Card.Content>
                    <Text variant="titleSmall" style={{ color: C.text2, fontWeight: '700', marginBottom: SP.md, textTransform: 'capitalize' }}>
                      {selected.replace(/_/g, ' ')} — Next 7 Days
                    </Text>
                    <LineChart
                      data={{ labels, datasets: [{ data: prices, strokeWidth: 2 }] }}
                      width={W - SP.lg * 2 - SP.xl * 2} height={190}
                      chartConfig={{
                        backgroundColor: C.surface2, backgroundGradientFrom: C.surface2,
                        backgroundGradientTo: C.surface2, decimalPlaces: 0,
                        color: () => t.color, labelColor: () => C.text3,
                        propsForDots: { r: '5', strokeWidth: '2', stroke: t.color },
                        propsForBackgroundLines: { stroke: C.border },
                      }}
                      bezier withShadow={false} style={{ borderRadius: SHAPE.md }}
                    />
                  </Card.Content>
                </Card>

                {/* Day list */}
                <Text variant="titleSmall" style={[s.dayLabel, { color: C.text2 }]}>Day-by-Day</Text>
                <Surface style={[s.dayList, { backgroundColor: C.surface }]} elevation={1}>
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
          </>
        )}

        {/* ── History tab ── */}
        {tab === 'history' && (
          <HistoryChart vegetable={selected} />
        )}

      </ScrollView>
    </View>
  );
}

const hs = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: SP.sm },
  statBox:  { flex: 1, alignItems: 'center', paddingVertical: SP.lg, borderRadius: SHAPE.lg, gap: SP.xs },
  chartCard: { marginHorizontal: SP.lg, marginBottom: SP.md, borderRadius: SHAPE.xl },
  dayLabel:  { marginHorizontal: SP.lg, marginBottom: SP.sm, fontWeight: '700' },
  dayList:   { marginHorizontal: SP.lg, borderRadius: SHAPE.xl, overflow: 'hidden' },
  dayRow:    { flexDirection: 'row', alignItems: 'center', gap: SP.md, paddingVertical: 14, paddingHorizontal: SP.lg },
});

const s = StyleSheet.create({
  root:    { flex: 1 },
  topBar:  { paddingHorizontal: SP.lg, paddingTop: SP.md, paddingBottom: SP.lg },
  appTitle: { fontWeight: '800' },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: SP.sm,
                marginHorizontal: SP.lg, marginBottom: SP.md, marginTop: SP.sm,
                borderRadius: SHAPE.lg, borderWidth: 1, paddingHorizontal: SP.md, paddingVertical: SP.sm },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 2 },

  chip: { borderRadius: SHAPE.full },

  statsRow: { flexDirection: 'row', marginHorizontal: SP.lg, marginBottom: SP.md, gap: SP.sm },
  statBox:  { flex: 1, alignItems: 'center', paddingVertical: SP.lg, borderRadius: SHAPE.lg, gap: SP.xs },

  chartCard: { marginHorizontal: SP.lg, marginBottom: SP.md, borderRadius: SHAPE.xl },

  dayLabel: { marginHorizontal: SP.lg, marginBottom: SP.sm, fontWeight: '700' },
  dayList:  { marginHorizontal: SP.lg, borderRadius: SHAPE.xl, overflow: 'hidden' },
  dayRow:   { flexDirection: 'row', alignItems: 'center', gap: SP.md, paddingVertical: 15, paddingHorizontal: SP.lg },
  dayBadge: { borderRadius: SHAPE.md, width: 38, height: 38, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  empty: { alignItems: 'center', paddingVertical: SP.huge },
});
