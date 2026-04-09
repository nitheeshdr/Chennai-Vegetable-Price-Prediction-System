import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, Share } from 'react-native';
import {
  Surface, Text, Card, Chip, ActivityIndicator,
  SegmentedButtons, Divider, IconButton,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { api, WeeklyForecastResponse, AIPredictionResponse } from '../services/api';
import { useC, useTREND } from '../context/ThemeContext';
import { SP, SHAPE } from '../theme';

const W = Dimensions.get('window').width;

export default function ForecastScreen({ route }: any) {
  const C     = useC();
  const TREND = useTREND();
  const { vegetable } = route.params as { vegetable: string };
  const label = vegetable.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

  const [forecast,  setForecast]  = useState<WeeklyForecastResponse | null>(null);
  const [bestPred,  setBestPred]  = useState<AIPredictionResponse | null>(null);
  const [aiPred,    setAiPred]    = useState<AIPredictionResponse | null>(null);
  const [markets,   setMarkets]   = useState<any>(null);
  const [loading,   setLoading]   = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [mode,      setMode]      = useState('seasonal');
  const [aiError,   setAiError]   = useState('');

  useEffect(() => {
    setLoading(true); setBestPred(null); setForecast(null); setAiPred(null); setMarkets(null);
    Promise.all([
      api.predict(vegetable).then(p => setBestPred(p as AIPredictionResponse)).catch(() => {}),
      api.getWeeklyForecast(vegetable).then(setForecast).catch(() => {}),
      api.getMarketComparison(vegetable).then(setMarkets).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [vegetable]);

  const fetchAI = (val: string) => {
    setMode(val);
    if (val === 'seasonal' || val === 'market') return;
    if (bestPred && bestPred.model_name && !bestPred.model_name.startsWith('seasonal')) {
      setAiPred(bestPred); return;
    }
    if (aiPred) return;
    setAiLoading(true); setAiError('');
    api.aiPredict(vegetable)
      .then(d => { setAiPred(d); setBestPred(d); })
      .catch((e: any) => setAiError(e?.response?.data?.error || 'AI prediction failed — try again'))
      .finally(() => setAiLoading(false));
  };

  const handleShare = async () => {
    const p = aiPred ?? bestPred;
    if (!p) return;
    try {
      await Share.share({
        message: `${label} price forecast for tomorrow: ₹${p.predicted_price.toFixed(0)}/kg (${p.trend === 'up' ? '↑ Rising' : p.trend === 'down' ? '↓ Falling' : '→ Stable'})\n\nRange: ₹${p.confidence_lower.toFixed(0)} – ₹${p.confidence_upper.toFixed(0)}\n\nPowered by VegPrice AI — Chennai Market Intelligence`,
      });
    } catch {}
  };

  const heroData = bestPred ?? forecast?.forecast?.[0];
  const t        = heroData ? TREND[heroData.trend] || TREND.stable : TREND.stable;
  const chartData = forecast?.forecast?.length ? {
    labels:   forecast.forecast.map(f => f.prediction_date.slice(5)),
    datasets: [{ data: forecast.forecast.map(f => f.predicted_price), strokeWidth: 2 }],
  } : null;

  if (loading) return (
    <View style={[s.center, { backgroundColor: C.bg }]}>
      <ActivityIndicator size="large" color={C.primary} />
      <Text variant="bodyMedium" style={{ color: C.text3, marginTop: SP.md }}>Loading forecast…</Text>
    </View>
  );

  return (
    <ScrollView style={[s.root, { backgroundColor: C.bg }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: SP.xxxl }}>

      {/* ── Hero ── */}
      <Surface style={[s.hero, { backgroundColor: C.surface2 }]} elevation={2}>
        <View style={s.heroHeader}>
          <View>
            <Text variant="displaySmall" style={[s.heroName, { color: C.text }]}>{label}</Text>
            <Text variant="labelLarge"   style={{ color: C.text3, marginTop: SP.xs }}>7-Day Price Forecast</Text>
          </View>
          {heroData && (
            <IconButton icon="share-variant-outline" iconColor={C.primary} size={22}
              containerColor={`${C.primary}18`} style={{ margin: 0 }} onPress={handleShare} />
          )}
        </View>

        {heroData && (
          <View style={s.heroGrid}>
            <View style={s.heroCol}>
              <Text variant="labelSmall"  style={[s.heroLabel, { color: C.text3 }]}>TODAY</Text>
              <Text variant="headlineSmall" style={{ color: C.text2, fontWeight: '700' }}>
                ₹{heroData.current_price?.toFixed(0) ?? '—'}
              </Text>
            </View>
            <Divider style={[s.heroDividerV, { backgroundColor: C.border }]} />
            <View style={[s.heroCol, { flex: 1.2 }]}>
              <Text variant="labelSmall"  style={[s.heroLabel, { color: C.text3 }]}>TOMORROW</Text>
              <Text variant="displaySmall" style={{ color: t.color, fontWeight: '900' }}>
                ₹{heroData.predicted_price.toFixed(0)}
              </Text>
            </View>
            <Divider style={[s.heroDividerV, { backgroundColor: C.border }]} />
            <View style={s.heroCol}>
              <Text variant="labelSmall" style={[s.heroLabel, { color: C.text3 }]}>TREND</Text>
              <Text variant="titleLarge" style={{ color: t.color, fontWeight: '800' }}>
                {t.emoji} {heroData.trend}
              </Text>
            </View>
          </View>
        )}

        {/* Best-buy indicator */}
        {heroData && (
          <View style={[s.bestBuy, {
            backgroundColor: heroData.trend === 'down' ? `${C.green}18` : heroData.trend === 'up' ? `${C.red}18` : `${C.amber}18`,
            borderColor: heroData.trend === 'down' ? `${C.green}40` : heroData.trend === 'up' ? `${C.red}40` : `${C.amber}40`,
          }]}>
            <MaterialCommunityIcons
              name={heroData.trend === 'down' ? 'cart-check' : heroData.trend === 'up' ? 'cart-remove' : 'cart-outline'}
              size={15}
              color={heroData.trend === 'down' ? C.green : heroData.trend === 'up' ? C.red : C.amber}
            />
            <Text variant="labelSmall" style={{ color: heroData.trend === 'down' ? C.green : heroData.trend === 'up' ? C.red : C.amber, fontWeight: '700' }}>
              {heroData.trend === 'down' ? 'Good time to buy — price falling tomorrow' :
               heroData.trend === 'up'   ? 'Buy today — price rising tomorrow' :
                                           'Stable prices — buy anytime'}
            </Text>
          </View>
        )}
      </Surface>

      {/* ── Mode Toggle ── */}
      <SegmentedButtons
        value={mode} onValueChange={fetchAI} style={s.segmented}
        buttons={[
          { value: 'seasonal', label: 'Seasonal', icon: 'chart-line',
            style: { backgroundColor: mode === 'seasonal' ? `${C.primary}20` : C.surface } },
          { value: 'ai', label: aiLoading ? 'Asking AI…' : 'AI Predict', icon: 'brain',
            style: { backgroundColor: mode === 'ai' ? `${C.primary}20` : C.surface }, disabled: aiLoading },
          { value: 'market', label: 'Markets', icon: 'storefront',
            style: { backgroundColor: mode === 'market' ? `${C.primary}20` : C.surface } },
        ]}
      />

      {/* ── AI Loading ── */}
      {mode === 'ai' && aiLoading && (
        <View style={[s.center, { paddingVertical: SP.huge }]}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text variant="bodyMedium" style={{ color: C.text3, marginTop: SP.md }}>Asking NVIDIA AI…</Text>
        </View>
      )}

      {/* ── AI Error ── */}
      {mode === 'ai' && !!aiError && !aiLoading && (
        <Surface style={[s.errCard, { backgroundColor: `${C.red}12`, borderColor: `${C.red}30` }]} elevation={0}>
          <MaterialCommunityIcons name="alert-circle-outline" size={20} color={C.red} />
          <Text variant="bodyMedium" style={{ color: C.red, flex: 1 }}>{aiError}</Text>
        </Surface>
      )}

      {/* ── AI Result ── */}
      {mode === 'ai' && (aiPred ?? bestPred) && !aiLoading && (
        <Card style={[s.aiCard, { backgroundColor: C.surface }]}>
          <Card.Content style={{ gap: SP.sm }}>
            <View style={s.aiHeader}>
              <MaterialCommunityIcons name="brain" size={18} color={C.primary} />
              <Text variant="titleMedium" style={{ color: C.primary, fontWeight: '700', flex: 1 }}>AI Prediction</Text>
              <Chip compact style={{ backgroundColor: `${C.primary}25` }}
                textStyle={{ color: C.primary, fontSize: 10, fontWeight: '800' }}>AI</Chip>
            </View>
            {(() => {
              const p = aiPred ?? bestPred!;
              return (
                <>
                  <Text variant="displaySmall" style={{ color: C.primary, fontWeight: '900', marginTop: SP.xs }}>
                    ₹{p.predicted_price.toFixed(0)}
                    <Text variant="titleMedium" style={{ color: C.text3, fontWeight: '400' }}>/kg</Text>
                  </Text>
                  <Text variant="bodySmall" style={{ color: C.text3 }}>
                    Range: ₹{p.confidence_lower.toFixed(0)} – ₹{p.confidence_upper.toFixed(0)}
                  </Text>
                  {(p as AIPredictionResponse).reasoning ? (
                    <Surface style={[s.reasonBox, { backgroundColor: C.surface2 }]} elevation={0}>
                      <Text variant="labelSmall" style={{ color: C.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SP.sm }}>
                        AI Reasoning
                      </Text>
                      <Text variant="bodyMedium" style={{ color: C.text2, lineHeight: 22 }}>
                        {(p as AIPredictionResponse).reasoning}
                      </Text>
                    </Surface>
                  ) : null}
                  <Text variant="labelSmall" style={{ color: C.text3 }}>Model: {p.model_name}</Text>
                </>
              );
            })()}
          </Card.Content>
        </Card>
      )}

      {/* ── Market Comparison ── */}
      {mode === 'market' && (
        <Card style={[s.aiCard, { backgroundColor: C.surface }]}>
          <Card.Content style={{ gap: SP.sm }}>
            <View style={s.aiHeader}>
              <MaterialCommunityIcons name="storefront" size={18} color={C.sky} />
              <Text variant="titleMedium" style={{ color: C.sky, fontWeight: '700', flex: 1 }}>Market Comparison</Text>
            </View>
            {markets ? (
              <>
                {markets.cheapest_market && (
                  <Surface style={[s.reasonBox, { backgroundColor: `${C.green}12`, borderColor: `${C.green}30`, borderWidth: 1 }]} elevation={0}>
                    <Text variant="labelSmall" style={{ color: C.green, fontWeight: '700' }}>
                      🏆 Cheapest: {markets.cheapest_market} — ₹{markets.cheapest_price?.toFixed(0)}/kg
                    </Text>
                  </Surface>
                )}
                {(markets.markets ?? []).map((m: any, i: number) => (
                  <View key={m.market}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: SP.sm }}>
                      <MaterialCommunityIcons name="store-outline" size={14} color={C.text3} />
                      <Text variant="bodyMedium" style={{ color: C.text, flex: 1, marginLeft: SP.sm }}>{m.market}</Text>
                      <Text variant="titleSmall" style={{ color: C.primary, fontWeight: '700' }}>₹{m.price?.toFixed(0)}/kg</Text>
                    </View>
                    {i < (markets.markets.length - 1) && <Divider style={{ backgroundColor: C.border }} />}
                  </View>
                ))}
                {!markets.markets?.length && (
                  <Text variant="bodyMedium" style={{ color: C.text3 }}>No market comparison data available.</Text>
                )}
              </>
            ) : (
              <ActivityIndicator size="small" color={C.primary} />
            )}
          </Card.Content>
        </Card>
      )}

      {/* ── Chart ── */}
      {mode === 'seasonal' && chartData && (
        <Card style={[s.chartCard, { backgroundColor: C.surface }]}>
          <Card.Content>
            <Text variant="titleSmall" style={{ color: C.text2, fontWeight: '700', marginBottom: SP.md }}>
              Price Trend — 7 Days
            </Text>
            <LineChart
              data={chartData} width={W - SP.lg * 2 - SP.xl * 2} height={188}
              chartConfig={{
                backgroundColor: C.surface2, backgroundGradientFrom: C.surface2,
                backgroundGradientTo: C.surface2, decimalPlaces: 0,
                color: () => C.primary, labelColor: () => C.text3,
                propsForDots: { r: '5', strokeWidth: '2', stroke: C.primary },
                propsForBackgroundLines: { stroke: C.border },
              }}
              bezier withShadow={false} style={{ borderRadius: SHAPE.md }}
            />
          </Card.Content>
        </Card>
      )}

      {/* ── Day list ── */}
      {mode === 'seasonal' && forecast?.forecast && (
        <View>
          <Text variant="titleSmall" style={[s.sectionLabel, { color: C.text2 }]}>Day-by-Day Forecast</Text>
          <Surface style={[s.dayList, { backgroundColor: C.surface }]} elevation={1}>
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
                        {pred.trend} · ₹{pred.confidence_lower?.toFixed(0)}–₹{pred.confidence_upper?.toFixed(0)}
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

      {!forecast && mode === 'seasonal' && (
        <View style={s.empty}>
          <MaterialCommunityIcons name="chart-line-variant" size={56} color={C.text3} />
          <Text variant="bodyLarge" style={{ color: C.text3, marginTop: SP.md }}>No forecast data available.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  empty:  { alignItems: 'center', paddingVertical: SP.huge },

  hero:       { paddingTop: SP.xxl, paddingBottom: SP.xxl, paddingHorizontal: SP.xl },
  heroHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: SP.xxl },
  heroName:   { fontWeight: '900', letterSpacing: -0.5 },
  heroGrid:   { flexDirection: 'row', alignItems: 'center' },
  heroCol:    { flex: 1, alignItems: 'center', paddingVertical: SP.md, gap: SP.sm },
  heroDividerV: { width: 1, height: 56 },
  heroLabel:  { letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 10 },
  bestBuy:    { flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginTop: SP.lg,
                borderRadius: SHAPE.sm, padding: SP.sm, paddingHorizontal: SP.md, borderWidth: 1 },

  segmented:   { marginHorizontal: SP.lg, marginTop: SP.lg, marginBottom: SP.md },
  sectionLabel:{ marginHorizontal: SP.lg, marginBottom: SP.sm, marginTop: SP.sm, fontWeight: '700' },

  errCard: { flexDirection: 'row', alignItems: 'center', gap: SP.md, marginHorizontal: SP.lg,
             marginBottom: SP.md, borderRadius: SHAPE.md, padding: SP.lg, borderWidth: 1 },
  aiCard:    { marginHorizontal: SP.lg, marginBottom: SP.md, borderRadius: SHAPE.xl },
  aiHeader:  { flexDirection: 'row', alignItems: 'center', gap: SP.sm },
  reasonBox: { borderRadius: SHAPE.md, padding: SP.lg, marginTop: SP.sm },
  chartCard: { marginHorizontal: SP.lg, marginBottom: SP.md, borderRadius: SHAPE.xl },
  dayList:   { marginHorizontal: SP.lg, borderRadius: SHAPE.xl, overflow: 'hidden' },
  dayRow:    { flexDirection: 'row', alignItems: 'center', gap: SP.md, paddingVertical: 15, paddingHorizontal: SP.lg },
  dayBadge:  { borderRadius: SHAPE.md, width: 38, height: 38, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
