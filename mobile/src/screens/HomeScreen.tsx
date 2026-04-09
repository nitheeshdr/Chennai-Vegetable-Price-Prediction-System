import React, { useEffect, useState } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import {
  Surface, Text, Card, Chip, Divider, ActivityIndicator,
  IconButton,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePriceStore } from '../store/priceStore';
import { api, WeatherResponse } from '../services/api';
import { C, TREND } from '../theme';

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
    <Surface style={styles.weatherSurface} elevation={2}>
      <View style={styles.weatherRow}>
        <Text style={styles.weatherEmoji}>{emoji}</Text>
        <View style={styles.weatherInfo}>
          <Text variant="headlineSmall" style={styles.weatherTemp}>
            {weather.temperature}°C
          </Text>
          <Text variant="bodyMedium" style={{ color: C.sky }}>
            {weather.condition}
          </Text>
          <Text variant="labelSmall" style={{ color: C.text3 }}>
            📍 {weather.location}
          </Text>
        </View>
        <View style={styles.weatherStats}>
          <View style={styles.statRow}>
            <MaterialCommunityIcons name="water-percent" size={13} color={C.sky} />
            <Text variant="labelMedium" style={{ color: C.text2 }}>{weather.humidity}%</Text>
          </View>
          <View style={styles.statRow}>
            <MaterialCommunityIcons name="weather-windy" size={13} color={C.sky} />
            <Text variant="labelMedium" style={{ color: C.text2 }}>{weather.wind_speed} km/h</Text>
          </View>
          <View style={styles.statRow}>
            <MaterialCommunityIcons name="weather-rainy" size={13} color={C.sky} />
            <Text variant="labelMedium" style={{ color: C.text2 }}>{weather.precipitation ?? 0} mm</Text>
          </View>
        </View>
      </View>
      {rainAlert && (
        <Surface style={styles.rainAlert} elevation={0}>
          <MaterialCommunityIcons name="alert" size={14} color="#f97316" />
          <Text variant="labelSmall" style={{ color: '#fed7aa', flex: 1 }}>
            Heavy rain may raise prices due to supply disruption
          </Text>
        </Surface>
      )}
    </Surface>
  );
}

function StatChips({ total, rising, falling }: { total: number; rising: number; falling: number }) {
  const items = [
    { label: `${total} Tracked`,           icon: 'basket-outline',        color: C.sky      },
    { label: `${rising} Rising`,            icon: 'trending-up',           color: C.red      },
    { label: `${falling} Falling`,          icon: 'trending-down',         color: C.green    },
    { label: `${total - rising - falling} Stable`, icon: 'minus',         color: C.amber    },
  ];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipContent}>
      {items.map(item => (
        <Chip
          key={item.label}
          icon={() => <MaterialCommunityIcons name={item.icon as any} size={15} color={item.color} />}
          style={[styles.statChip, { borderColor: item.color + '40' }]}
          textStyle={{ color: item.color, fontSize: 12, fontWeight: '700' }}
          mode="outlined"
          compact
        >
          {item.label}
        </Chip>
      ))}
    </ScrollView>
  );
}

export default function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { dashboard, isLoading, fetchDashboard } = usePriceStore();
  const [weather, setWeather]   = useState<WeatherResponse | null>(null);

  const refresh = () => {
    fetchDashboard();
    api.getWeather().then(setWeather).catch(() => {});
  };
  useEffect(() => { refresh(); }, []);

  const rising  = dashboard?.all_predictions.filter(p => p.trend === 'up').length   ?? 0;
  const falling = dashboard?.all_predictions.filter(p => p.trend === 'down').length ?? 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top App Bar */}
      <Surface style={styles.appbar} elevation={0}>
        <View style={styles.appbarContent}>
          <View>
            <Text variant="headlineMedium" style={styles.appTitle}>VegPrice AI</Text>
            <Text variant="labelMedium" style={{ color: C.text3 }}>Chennai Market Intelligence</Text>
          </View>
          <IconButton
            icon="cog-outline"
            iconColor={C.primary}
            size={24}
            style={styles.settingsBtn}
            onPress={() => navigation.navigate('Admin')}
          />
        </View>
        {dashboard && (
          <Text variant="labelSmall" style={styles.metaText}>
            Updated {dashboard.last_updated} · {dashboard.markets_tracked} markets
          </Text>
        )}
      </Surface>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} colors={[C.primary]} tintColor={C.primary} />
        }
      >
        {/* Weather */}
        {weather ? (
          <WeatherCard weather={weather} />
        ) : (
          <Surface style={styles.weatherSkeleton} elevation={1}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text variant="bodyMedium" style={{ color: C.text3, marginLeft: 10 }}>Loading Chennai weather...</Text>
          </Surface>
        )}

        {/* Stat chips */}
        {dashboard && (
          <StatChips total={dashboard.total_vegetables} rising={rising} falling={falling} />
        )}

        {isLoading && !dashboard && (
          <View style={styles.loadCenter}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        )}

        {dashboard && (
          <>
            {/* Rising section */}
            {dashboard.top_rising.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="trending-up" size={16} color={C.red} />
                  <Text variant="titleSmall" style={[styles.sectionTitle, { color: C.red }]}>Rising Tomorrow</Text>
                </View>
                {dashboard.top_rising.map(item => {
                  const name = item.vegetable.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                  return (
                    <Card
                      key={item.vegetable}
                      style={styles.trendCard}
                      onPress={() => navigation.navigate('Forecast', { vegetable: item.vegetable })}
                    >
                      <Card.Content style={styles.trendCardContent}>
                        <View style={[styles.trendDot, { backgroundColor: C.red }]} />
                        <Text variant="bodyLarge" style={styles.trendName}>{name}</Text>
                        <View style={{ flex: 1 }} />
                        <View style={styles.trendRight}>
                          <Text variant="titleMedium" style={{ color: C.red, fontWeight: '800' }}>
                            +{item.change_pct}%
                          </Text>
                          <Text variant="labelMedium" style={{ color: C.text3 }}>
                            ₹{item.predicted_price.toFixed(0)}/kg
                          </Text>
                        </View>
                      </Card.Content>
                    </Card>
                  );
                })}
              </View>
            )}

            {/* Falling section */}
            {dashboard.top_falling.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="trending-down" size={16} color={C.green} />
                  <Text variant="titleSmall" style={[styles.sectionTitle, { color: C.green }]}>Falling Tomorrow</Text>
                </View>
                {dashboard.top_falling.map(item => {
                  const name = item.vegetable.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                  return (
                    <Card
                      key={item.vegetable}
                      style={styles.trendCard}
                      onPress={() => navigation.navigate('Forecast', { vegetable: item.vegetable })}
                    >
                      <Card.Content style={styles.trendCardContent}>
                        <View style={[styles.trendDot, { backgroundColor: C.green }]} />
                        <Text variant="bodyLarge" style={styles.trendName}>{name}</Text>
                        <View style={{ flex: 1 }} />
                        <View style={styles.trendRight}>
                          <Text variant="titleMedium" style={{ color: C.green, fontWeight: '800' }}>
                            {item.change_pct}%
                          </Text>
                          <Text variant="labelMedium" style={{ color: C.text3 }}>
                            ₹{item.predicted_price.toFixed(0)}/kg
                          </Text>
                        </View>
                      </Card.Content>
                    </Card>
                  );
                })}
              </View>
            )}

            {/* All vegetables */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="basket" size={16} color={C.primary} />
                <Text variant="titleSmall" style={[styles.sectionTitle, { color: C.primary }]}>All Vegetables</Text>
              </View>
              <Surface style={styles.allVegSurface} elevation={1}>
                {dashboard.all_predictions.map((pred, idx) => {
                  const t    = TREND[pred.trend] || TREND.stable;
                  const name = pred.vegetable.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                  const pct  = pred.current_price
                    ? (((pred.predicted_price - pred.current_price) / pred.current_price) * 100).toFixed(1)
                    : null;
                  return (
                    <View key={pred.vegetable}>
                      <View
                        style={styles.vegRow}
                      >
                        <View style={[styles.vegDot, { backgroundColor: t.color }]} />
                        <Text
                          variant="bodyMedium"
                          style={styles.vegName}
                          onPress={() => navigation.navigate('Forecast', { vegetable: pred.vegetable })}
                        >
                          {name}
                        </Text>
                        <View style={{ flex: 1 }} />
                        <Text variant="labelMedium" style={{ color: C.text3, marginRight: 8 }}>
                          {t.emoji} {pred.trend}
                        </Text>
                        <Text variant="titleSmall" style={{ color: t.color, fontWeight: '700', minWidth: 55, textAlign: 'right' }}>
                          ₹{pred.predicted_price.toFixed(0)}
                        </Text>
                        {pct && (
                          <Text variant="labelSmall" style={{ color: t.color, minWidth: 46, textAlign: 'right' }}>
                            {Number(pct) > 0 ? '+' : ''}{pct}%
                          </Text>
                        )}
                      </View>
                      {idx < dashboard.all_predictions.length - 1 && (
                        <Divider style={{ backgroundColor: C.border, marginLeft: 32 }} />
                      )}
                    </View>
                  );
                })}
              </Surface>
            </View>
          </>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: C.bg },
  appbar:        { backgroundColor: C.surface, paddingHorizontal: 20, paddingBottom: 12, paddingTop: 8 },
  appbarContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  appTitle:      { color: C.text, fontWeight: '800' },
  metaText:      { color: C.text3, marginTop: 4 },
  settingsBtn:   { backgroundColor: `${C.primary}18`, margin: 0 },

  weatherSurface:  { margin: 16, borderRadius: 20, padding: 16, backgroundColor: C.surface2 },
  weatherRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weatherEmoji:    { fontSize: 44 },
  weatherInfo:    { flex: 1, gap: 2 },
  weatherTemp:    { color: C.text, fontWeight: '800' },
  weatherStats:   { gap: 6, alignItems: 'flex-end' },
  statRow:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rainAlert:      {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, backgroundColor: '#f9731615', borderRadius: 8, padding: 8,
    borderLeftWidth: 3, borderLeftColor: '#f97316',
  },
  weatherSkeleton: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, borderRadius: 20, padding: 20, backgroundColor: C.surface,
  },

  chipScroll:  { marginBottom: 8 },
  chipContent: { paddingHorizontal: 16, gap: 8 },
  statChip:    { backgroundColor: C.surface2 },

  loadCenter: { alignItems: 'center', marginTop: 60 },

  section:       { marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, marginBottom: 8, marginTop: 8 },
  sectionTitle:  { fontWeight: '700', letterSpacing: 0.3 },

  trendCard:        { marginHorizontal: 16, marginBottom: 6, backgroundColor: C.surface, borderRadius: 16 },
  trendCardContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  trendDot:         { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  trendName:        { color: C.text, fontWeight: '600', textTransform: 'capitalize' },
  trendRight:       { alignItems: 'flex-end', gap: 2 },

  allVegSurface: { marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', backgroundColor: C.surface },
  vegRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 16 },
  vegDot:        { width: 7, height: 7, borderRadius: 4 },
  vegName:       { color: C.text, fontWeight: '600', textTransform: 'capitalize' },
});
