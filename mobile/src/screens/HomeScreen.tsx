import React, { useEffect, useState } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import {
  Surface, Text, Card, Divider, ActivityIndicator, IconButton,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePriceStore } from '../store/priceStore';
import { api, WeatherResponse } from '../services/api';
import { C, SP, SHAPE, TREND } from '../theme';

const WMO_EMOJI: Record<number, string> = {
  0: '☀️', 1: '🌤', 2: '⛅', 3: '☁️',
  45: '🌫', 48: '🌫', 51: '🌦', 53: '🌧', 55: '🌧',
  61: '🌧', 63: '🌧', 65: '⛈', 80: '🌦', 81: '🌧', 82: '⛈',
  95: '⛈', 96: '⛈', 99: '⛈',
};

function WeatherCard({ weather }: { weather: WeatherResponse }) {
  const emoji     = WMO_EMOJI[weather.weather_code] ?? '🌡';
  const rainAlert = (weather.precipitation ?? 0) > 5;

  return (
    <Surface style={s.weatherCard} elevation={2}>
      <View style={s.weatherRow}>
        <Text style={s.weatherEmoji}>{emoji}</Text>
        <View style={s.weatherInfo}>
          <Text variant="headlineSmall" style={s.weatherTemp}>{weather.temperature}°C</Text>
          <Text variant="bodyMedium" style={{ color: C.sky }}>{weather.condition}</Text>
          <Text variant="labelSmall" style={{ color: C.text3, marginTop: SP.xs }}>
            📍 {weather.location}
          </Text>
        </View>
        <View style={s.weatherMeta}>
          {[
            { icon: 'water-percent', val: `${weather.humidity}%` },
            { icon: 'weather-windy', val: `${weather.wind_speed} km/h` },
            { icon: 'weather-rainy', val: `${weather.precipitation ?? 0} mm` },
          ].map(item => (
            <View key={item.icon} style={s.metaRow}>
              <MaterialCommunityIcons name={item.icon as any} size={13} color={C.sky} />
              <Text variant="labelSmall" style={{ color: C.text2 }}>{item.val}</Text>
            </View>
          ))}
        </View>
      </View>
      {rainAlert && (
        <View style={s.rainAlert}>
          <MaterialCommunityIcons name="alert" size={14} color="#F97316" />
          <Text variant="labelSmall" style={{ color: '#FED7AA', flex: 1 }}>
            Heavy rain — vegetable prices may rise due to supply disruption
          </Text>
        </View>
      )}
    </Surface>
  );
}

function StatRow({ total, rising, falling }: { total: number; rising: number; falling: number }) {
  const items = [
    { label: `${total}`,           sub: 'Tracked',  color: C.primary },
    { label: `${rising}`,          sub: 'Rising',   color: C.red     },
    { label: `${falling}`,         sub: 'Falling',  color: C.green   },
    { label: `${total-rising-falling}`, sub: 'Stable', color: C.amber },
  ];
  return (
    <View style={s.statRow}>
      {items.map((item, idx) => (
        <React.Fragment key={item.sub}>
          <View style={s.statItem}>
            <Text variant="headlineMedium" style={{ color: item.color, fontWeight: '800', lineHeight: 36 }}>
              {item.label}
            </Text>
            <Text variant="labelSmall" style={{ color: C.text3, marginTop: 2 }}>{item.sub}</Text>
          </View>
          {idx < items.length - 1 && (
            <View style={s.statDivider} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

export default function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { dashboard, isLoading, fetchDashboard } = usePriceStore();
  const [weather, setWeather] = useState<WeatherResponse | null>(null);

  const refresh = () => {
    fetchDashboard();
    api.getWeather().then(setWeather).catch(() => {});
  };
  useEffect(() => { refresh(); }, []);

  const rising  = dashboard?.all_predictions.filter(p => p.trend === 'up').length   ?? 0;
  const falling = dashboard?.all_predictions.filter(p => p.trend === 'down').length ?? 0;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* ── Top App Bar ── */}
      <Surface style={s.topBar} elevation={0}>
        <View style={s.topBarInner}>
          <View style={s.topBarText}>
            <Text variant="headlineMedium" style={s.appTitle}>VegPrice AI</Text>
            <Text variant="labelMedium" style={{ color: C.text3 }}>Chennai Market Intelligence</Text>
          </View>
          <IconButton
            icon="cog-outline"
            iconColor={C.primary}
            size={22}
            containerColor={`${C.primary}18`}
            style={{ margin: 0 }}
            onPress={() => navigation.navigate('Admin')}
          />
        </View>
        {dashboard && (
          <Text variant="labelSmall" style={{ color: C.text3, marginTop: SP.sm }}>
            Updated {dashboard.last_updated} · {dashboard.markets_tracked} markets
          </Text>
        )}
      </Surface>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} colors={[C.primary]} tintColor={C.primary} />
        }
        contentContainerStyle={{ paddingBottom: SP.xxxl }}
      >
        {/* ── Weather ── */}
        {weather ? (
          <WeatherCard weather={weather} />
        ) : (
          <Surface style={s.weatherSkeleton} elevation={1}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text variant="bodyMedium" style={{ color: C.text3, marginLeft: SP.md }}>Loading Chennai weather…</Text>
          </Surface>
        )}

        {/* ── Stats ── */}
        {dashboard && (
          <Surface style={s.statCard} elevation={1}>
            <StatRow total={dashboard.total_vegetables} rising={rising} falling={falling} />
          </Surface>
        )}

        {isLoading && !dashboard && (
          <View style={{ alignItems: 'center', marginTop: SP.huge }}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        )}

        {dashboard && (
          <>
            {/* ── Rising ── */}
            {dashboard.top_rising.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHead}>
                  <MaterialCommunityIcons name="trending-up" size={16} color={C.red} />
                  <Text variant="titleSmall" style={[s.sectionTitle, { color: C.red }]}>Rising Tomorrow</Text>
                </View>
                {dashboard.top_rising.map(item => (
                  <Card
                    key={item.vegetable}
                    style={s.trendCard}
                    onPress={() => navigation.navigate('Forecast', { vegetable: item.vegetable })}
                  >
                    <Card.Content style={s.trendContent}>
                      <View style={[s.trendDot, { backgroundColor: C.red }]} />
                      <Text variant="bodyLarge" style={s.trendName}>
                        {item.vegetable.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
                      </Text>
                      <View style={{ flex: 1 }} />
                      <Text variant="titleMedium" style={{ color: C.red, fontWeight: '800' }}>
                        +{item.change_pct}%
                      </Text>
                      <Text variant="labelMedium" style={{ color: C.text3, minWidth: 64, textAlign: 'right' }}>
                        ₹{item.predicted_price.toFixed(0)}/kg
                      </Text>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            )}

            {/* ── Falling ── */}
            {dashboard.top_falling.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHead}>
                  <MaterialCommunityIcons name="trending-down" size={16} color={C.green} />
                  <Text variant="titleSmall" style={[s.sectionTitle, { color: C.green }]}>Falling Tomorrow</Text>
                </View>
                {dashboard.top_falling.map(item => (
                  <Card
                    key={item.vegetable}
                    style={s.trendCard}
                    onPress={() => navigation.navigate('Forecast', { vegetable: item.vegetable })}
                  >
                    <Card.Content style={s.trendContent}>
                      <View style={[s.trendDot, { backgroundColor: C.green }]} />
                      <Text variant="bodyLarge" style={s.trendName}>
                        {item.vegetable.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
                      </Text>
                      <View style={{ flex: 1 }} />
                      <Text variant="titleMedium" style={{ color: C.green, fontWeight: '800' }}>
                        {item.change_pct}%
                      </Text>
                      <Text variant="labelMedium" style={{ color: C.text3, minWidth: 64, textAlign: 'right' }}>
                        ₹{item.predicted_price.toFixed(0)}/kg
                      </Text>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            )}

            {/* ── All Vegetables ── */}
            <View style={s.section}>
              <View style={s.sectionHead}>
                <MaterialCommunityIcons name="basket-outline" size={16} color={C.primary} />
                <Text variant="titleSmall" style={[s.sectionTitle, { color: C.primary }]}>All Vegetables</Text>
              </View>
              <Surface style={s.allVegCard} elevation={1}>
                {dashboard.all_predictions.map((pred, idx) => {
                  const t   = TREND[pred.trend] || TREND.stable;
                  const nm  = pred.vegetable.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
                  const pct = pred.current_price
                    ? (((pred.predicted_price - pred.current_price) / pred.current_price) * 100).toFixed(1)
                    : null;
                  return (
                    <View key={pred.vegetable}>
                      <View
                        style={s.vegRow}
                        onTouchEnd={() => navigation.navigate('Forecast', { vegetable: pred.vegetable })}
                      >
                        <View style={[s.vegDot, { backgroundColor: t.color }]} />
                        <Text variant="bodyMedium" style={s.vegName}>{nm}</Text>
                        <View style={{ flex: 1 }} />
                        <Text variant="labelMedium" style={{ color: C.text3, marginRight: SP.sm }}>
                          {t.emoji} {pred.trend}
                        </Text>
                        <Text variant="titleSmall" style={{ color: t.color, fontWeight: '700', minWidth: 52, textAlign: 'right' }}>
                          ₹{pred.predicted_price.toFixed(0)}
                        </Text>
                        {pct && (
                          <Text variant="labelSmall" style={{ color: t.color, minWidth: 48, textAlign: 'right' }}>
                            {Number(pct) > 0 ? '+' : ''}{pct}%
                          </Text>
                        )}
                      </View>
                      {idx < dashboard.all_predictions.length - 1 && (
                        <Divider style={{ backgroundColor: C.border, marginLeft: SP.xxxl }} />
                      )}
                    </View>
                  );
                })}
              </Surface>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },

  // Top app bar
  topBar:      { backgroundColor: C.surface, paddingHorizontal: SP.lg, paddingTop: SP.md, paddingBottom: SP.lg },
  topBarInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  topBarText:  { gap: SP.xs },
  appTitle:    { color: C.text, fontWeight: '800', letterSpacing: -0.3 },

  // Weather
  weatherCard:    { backgroundColor: C.surface2, margin: SP.lg, borderRadius: SHAPE.xl, padding: SP.xl },
  weatherRow:     { flexDirection: 'row', alignItems: 'center', gap: SP.lg },
  weatherEmoji:   { fontSize: 44 },
  weatherInfo:    { flex: 1, gap: SP.xs },
  weatherTemp:    { color: C.text, fontWeight: '800' },
  weatherMeta:    { gap: SP.sm, alignItems: 'flex-end' },
  metaRow:        { flexDirection: 'row', alignItems: 'center', gap: SP.xs },
  rainAlert:      {
    flexDirection: 'row', alignItems: 'center', gap: SP.sm,
    marginTop: SP.md, backgroundColor: '#F9731615', borderRadius: SHAPE.sm,
    padding: SP.sm, borderLeftWidth: 3, borderLeftColor: '#F97316',
  },
  weatherSkeleton: {
    flexDirection: 'row', alignItems: 'center',
    margin: SP.lg, borderRadius: SHAPE.xl, padding: SP.xl, backgroundColor: C.surface,
  },

  // Stats
  statCard:    { marginHorizontal: SP.lg, borderRadius: SHAPE.xl, backgroundColor: C.surface, marginBottom: SP.md },
  statRow:     { flexDirection: 'row', paddingVertical: SP.xl },
  statItem:    { flex: 1, alignItems: 'center', gap: SP.xs },
  statDivider: { width: 1, backgroundColor: C.border, marginVertical: SP.sm },

  // Sections
  section:     { marginBottom: SP.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, paddingHorizontal: SP.lg, paddingVertical: SP.md },
  sectionTitle: { fontWeight: '700', letterSpacing: 0.2 },

  // Trend cards
  trendCard:    { marginHorizontal: SP.lg, marginBottom: SP.sm, backgroundColor: C.surface, borderRadius: SHAPE.lg },
  trendContent: { flexDirection: 'row', alignItems: 'center', gap: SP.md, paddingVertical: SP.sm },
  trendDot:     { width: 8, height: 8, borderRadius: 4 },
  trendName:    { color: C.text, fontWeight: '600', textTransform: 'capitalize' },

  // All veg list
  allVegCard: { marginHorizontal: SP.lg, borderRadius: SHAPE.xl, overflow: 'hidden', backgroundColor: C.surface },
  vegRow:     { flexDirection: 'row', alignItems: 'center', gap: SP.sm, paddingVertical: 14, paddingHorizontal: SP.lg },
  vegDot:     { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  vegName:    { color: C.text, fontWeight: '600', textTransform: 'capitalize' },
});
