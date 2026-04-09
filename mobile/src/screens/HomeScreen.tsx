import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { Surface, Text, Card, Divider, ActivityIndicator, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePriceStore } from '../store/priceStore';
import { api, WeatherResponse } from '../services/api';
import { useC, useTREND, useIsDark, useToggleTheme } from '../context/ThemeContext';
import { SP, SHAPE } from '../theme';

const FAVS_KEY = '@veg_favorites';

const WMO_EMOJI: Record<number, string> = {
  0: '☀️', 1: '🌤', 2: '⛅', 3: '☁️',
  45: '🌫', 48: '🌫', 51: '🌦', 53: '🌧', 55: '🌧',
  61: '🌧', 63: '🌧', 65: '⛈', 80: '🌦', 81: '🌧', 82: '⛈',
  95: '⛈', 96: '⛈', 99: '⛈',
};

function WeatherCard({ weather }: { weather: WeatherResponse }) {
  const C         = useC();
  const emoji     = WMO_EMOJI[weather.weather_code] ?? '🌡';
  const rainAlert = (weather.precipitation ?? 0) > 5;
  return (
    <Surface style={[s.weatherCard, { backgroundColor: C.surface2 }]} elevation={2}>
      <View style={s.weatherRow}>
        <Text style={s.weatherEmoji}>{emoji}</Text>
        <View style={s.weatherInfo}>
          <Text variant="headlineSmall" style={[s.weatherTemp, { color: C.text }]}>{weather.temperature}°C</Text>
          <Text variant="bodyMedium"   style={{ color: C.sky }}>{weather.condition}</Text>
          <Text variant="labelSmall"   style={{ color: C.text3, marginTop: SP.xs }}>📍 {weather.location}</Text>
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
        <View style={[s.rainAlert, { backgroundColor: '#F9731615', borderLeftColor: '#F97316' }]}>
          <MaterialCommunityIcons name="alert" size={14} color="#F97316" />
          <Text variant="labelSmall" style={{ color: '#FED7AA', flex: 1 }}>
            Heavy rain — vegetable prices may rise due to supply disruption
          </Text>
        </View>
      )}
    </Surface>
  );
}

export default function HomeScreen({ navigation }: any) {
  const C           = useC();
  const TREND       = useTREND();
  const isDark      = useIsDark();
  const toggleTheme = useToggleTheme();
  const insets      = useSafeAreaInsets();
  const { dashboard, isLoading, fetchDashboard } = usePriceStore();
  const [weather,   setWeather]   = useState<WeatherResponse | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Load favorites from storage
  useEffect(() => {
    AsyncStorage.getItem(FAVS_KEY).then(v => {
      if (v) setFavorites(new Set(JSON.parse(v)));
    }).catch(() => {});
  }, []);

  const toggleFavorite = useCallback((veg: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      next.has(veg) ? next.delete(veg) : next.add(veg);
      AsyncStorage.setItem(FAVS_KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  const refresh = () => {
    fetchDashboard();
    api.getWeather().then(setWeather).catch(() => {});
  };
  useEffect(() => { refresh(); }, []);

  const rising  = dashboard?.all_predictions.filter(p => p.trend === 'up').length   ?? 0;
  const falling = dashboard?.all_predictions.filter(p => p.trend === 'down').length ?? 0;

  const statItems = [
    { label: `${dashboard?.total_vegetables ?? 0}`, sub: 'Tracked',                  color: C.primary },
    { label: `${rising}`,                            sub: 'Rising',                   color: C.red     },
    { label: `${falling}`,                           sub: 'Falling',                  color: C.green   },
    { label: `${(dashboard?.total_vegetables ?? 0) - rising - falling}`, sub: 'Stable', color: C.amber },
  ];

  // Sort: favorites first, then rest
  const sortedPredictions = dashboard?.all_predictions
    ? [
        ...dashboard.all_predictions.filter(p => favorites.has(p.vegetable)),
        ...dashboard.all_predictions.filter(p => !favorites.has(p.vegetable)),
      ]
    : [];

  return (
    <View style={[s.root, { paddingTop: insets.top, backgroundColor: C.bg }]}>
      {/* ── Top App Bar ── */}
      <Surface style={[s.topBar, { backgroundColor: C.surface }]} elevation={0}>
        <View style={s.topBarInner}>
          <View style={s.topBarText}>
            <Text variant="headlineMedium" style={[s.appTitle, { color: C.text }]}>VegPrice AI</Text>
            <Text variant="labelMedium"    style={{ color: C.text3 }}>Chennai Market Intelligence</Text>
          </View>
          <View style={s.topBarActions}>
            <IconButton
              icon={isDark ? 'weather-sunny' : 'weather-night'}
              iconColor={C.primary}
              size={20}
              containerColor={`${C.primary}18`}
              style={{ margin: 0 }}
              onPress={toggleTheme}
            />
            <IconButton
              icon="cog-outline"
              iconColor={C.primary}
              size={20}
              containerColor={`${C.primary}18`}
              style={{ margin: 0 }}
              onPress={() => navigation.navigate('Admin')}
            />
          </View>
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
          <Surface style={[s.weatherSkeleton, { backgroundColor: C.surface }]} elevation={1}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text variant="bodyMedium" style={{ color: C.text3, marginLeft: SP.md }}>Loading Chennai weather…</Text>
          </Surface>
        )}

        {/* ── Stats ── */}
        {dashboard && (
          <Surface style={[s.statCard, { backgroundColor: C.surface }]} elevation={1}>
            <View style={s.statRow}>
              {statItems.map((item, idx) => (
                <React.Fragment key={item.sub}>
                  <View style={s.statItem}>
                    <Text variant="headlineMedium" style={{ color: item.color, fontWeight: '800', lineHeight: 36 }}>
                      {item.label}
                    </Text>
                    <Text variant="labelSmall" style={{ color: C.text3, marginTop: 2 }}>{item.sub}</Text>
                  </View>
                  {idx < statItems.length - 1 && <View style={[s.statDivider, { backgroundColor: C.border }]} />}
                </React.Fragment>
              ))}
            </View>
          </Surface>
        )}

        {isLoading && !dashboard && (
          <View style={{ alignItems: 'center', marginTop: SP.huge }}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        )}

        {dashboard && (
          <>
            {dashboard.top_rising.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHead}>
                  <MaterialCommunityIcons name="trending-up" size={16} color={C.red} />
                  <Text variant="titleSmall" style={[s.sectionTitle, { color: C.red }]}>Rising Tomorrow</Text>
                </View>
                {dashboard.top_rising.map(item => (
                  <Card key={item.vegetable} style={[s.trendCard, { backgroundColor: C.surface }]}
                    onPress={() => navigation.navigate('Forecast', { vegetable: item.vegetable })}>
                    <Card.Content style={s.trendContent}>
                      <View style={[s.trendDot, { backgroundColor: C.red }]} />
                      <Text variant="bodyLarge" style={[s.trendName, { color: C.text }]}>
                        {item.vegetable.replace(/_/g,' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
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

            {dashboard.top_falling.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHead}>
                  <MaterialCommunityIcons name="trending-down" size={16} color={C.green} />
                  <Text variant="titleSmall" style={[s.sectionTitle, { color: C.green }]}>Falling Tomorrow</Text>
                </View>
                {dashboard.top_falling.map(item => (
                  <Card key={item.vegetable} style={[s.trendCard, { backgroundColor: C.surface }]}
                    onPress={() => navigation.navigate('Forecast', { vegetable: item.vegetable })}>
                    <Card.Content style={s.trendContent}>
                      <View style={[s.trendDot, { backgroundColor: C.green }]} />
                      <Text variant="bodyLarge" style={[s.trendName, { color: C.text }]}>
                        {item.vegetable.replace(/_/g,' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
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

            {/* ── All Vegetables (with favorites) ── */}
            <View style={s.section}>
              <View style={s.sectionHead}>
                <MaterialCommunityIcons name="basket-outline" size={16} color={C.primary} />
                <Text variant="titleSmall" style={[s.sectionTitle, { color: C.primary }]}>All Vegetables</Text>
                {favorites.size > 0 && (
                  <View style={[s.favBadge, { backgroundColor: `${C.amber}25` }]}>
                    <MaterialCommunityIcons name="star" size={11} color={C.amber} />
                    <Text variant="labelSmall" style={{ color: C.amber, fontWeight: '700', fontSize: 11 }}>
                      {favorites.size} starred
                    </Text>
                  </View>
                )}
              </View>
              <Surface style={[s.allVegCard, { backgroundColor: C.surface }]} elevation={1}>
                {sortedPredictions.map((pred, idx) => {
                  const t    = TREND[pred.trend] || TREND.stable;
                  const nm   = pred.vegetable.replace(/_/g,' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                  const pct  = pred.current_price
                    ? (((pred.predicted_price - pred.current_price) / pred.current_price) * 100).toFixed(1)
                    : null;
                  const isFav = favorites.has(pred.vegetable);
                  return (
                    <View key={pred.vegetable}>
                      <TouchableOpacity
                        style={s.vegRow}
                        onPress={() => navigation.navigate('Forecast', { vegetable: pred.vegetable })}
                        activeOpacity={0.7}>
                        <TouchableOpacity onPress={() => toggleFavorite(pred.vegetable)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <MaterialCommunityIcons
                            name={isFav ? 'star' : 'star-outline'}
                            size={16}
                            color={isFav ? C.amber : C.text3}
                          />
                        </TouchableOpacity>
                        <View style={[s.vegDot, { backgroundColor: t.color }]} />
                        <Text variant="bodyMedium" style={[s.vegName, { color: C.text }]}>{nm}</Text>
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
                      </TouchableOpacity>
                      {idx < sortedPredictions.length - 1 && (
                        <Divider style={{ backgroundColor: C.border, marginLeft: SP.xxxl + SP.xl }} />
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
  root:        { flex: 1 },
  topBar:      { paddingHorizontal: SP.lg, paddingTop: SP.md, paddingBottom: SP.lg },
  topBarInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  topBarText:  { gap: SP.xs, flex: 1 },
  topBarActions: { flexDirection: 'row', gap: SP.xs },
  appTitle:    { fontWeight: '800', letterSpacing: -0.3 },

  weatherCard:    { margin: SP.lg, borderRadius: SHAPE.xl, padding: SP.xl },
  weatherRow:     { flexDirection: 'row', alignItems: 'center', gap: SP.lg },
  weatherEmoji:   { fontSize: 44 },
  weatherInfo:    { flex: 1, gap: SP.xs },
  weatherTemp:    { fontWeight: '800' },
  weatherMeta:    { gap: SP.sm, alignItems: 'flex-end' },
  metaRow:        { flexDirection: 'row', alignItems: 'center', gap: SP.xs },
  rainAlert:      {
    flexDirection: 'row', alignItems: 'center', gap: SP.sm,
    marginTop: SP.md, borderRadius: SHAPE.sm,
    padding: SP.sm, borderLeftWidth: 3,
  },
  weatherSkeleton: { flexDirection: 'row', alignItems: 'center', margin: SP.lg, borderRadius: SHAPE.xl, padding: SP.xl },

  statCard:    { marginHorizontal: SP.lg, borderRadius: SHAPE.xl, marginBottom: SP.md },
  statRow:     { flexDirection: 'row', paddingVertical: SP.xl },
  statItem:    { flex: 1, alignItems: 'center', gap: SP.xs },
  statDivider: { width: 1, marginVertical: SP.sm },

  section:      { marginBottom: SP.sm },
  sectionHead:  { flexDirection: 'row', alignItems: 'center', gap: SP.sm, paddingHorizontal: SP.lg, paddingVertical: SP.md },
  sectionTitle: { fontWeight: '700', letterSpacing: 0.2 },
  favBadge:     { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: SHAPE.full, paddingHorizontal: SP.sm, paddingVertical: 2 },

  trendCard:    { marginHorizontal: SP.lg, marginBottom: SP.sm, borderRadius: SHAPE.lg },
  trendContent: { flexDirection: 'row', alignItems: 'center', gap: SP.md, paddingVertical: SP.sm },
  trendDot:     { width: 8, height: 8, borderRadius: 4 },
  trendName:    { fontWeight: '600', textTransform: 'capitalize' },

  allVegCard: { marginHorizontal: SP.lg, borderRadius: SHAPE.xl, overflow: 'hidden' },
  vegRow:     { flexDirection: 'row', alignItems: 'center', gap: SP.sm, paddingVertical: 14, paddingHorizontal: SP.lg },
  vegDot:     { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  vegName:    { fontWeight: '600', textTransform: 'capitalize' },
});
