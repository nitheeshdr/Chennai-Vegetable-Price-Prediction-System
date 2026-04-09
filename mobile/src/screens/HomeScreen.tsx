import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePriceStore } from '../store/priceStore';
import PriceCard from '../components/PriceCard';
import { api, WeatherResponse } from '../services/api';
import { C } from '../theme';

const WMO_EMOJI: Record<number, string> = {
  0: '☀️', 1: '🌤', 2: '⛅', 3: '☁️',
  45: '🌫', 48: '🌫', 51: '🌦', 53: '🌧', 55: '🌧',
  61: '🌧', 63: '🌧', 65: '⛈', 80: '🌦', 81: '🌧', 82: '⛈',
  95: '⛈', 96: '⛈', 99: '⛈',
};

function WeatherBanner({ weather }: { weather: WeatherResponse }) {
  const emoji = WMO_EMOJI[weather.weather_code] ?? '🌡';
  const rainAlert = (weather.precipitation ?? 0) > 5;

  return (
    <LinearGradient
      colors={['#0c2a5e', '#0f1d35']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={styles.weatherCard}
    >
      <View style={styles.weatherTop}>
        <View style={styles.weatherMain}>
          <Text style={styles.weatherEmoji}>{emoji}</Text>
          <View>
            <Text style={styles.weatherTemp}>{weather.temperature}°C</Text>
            <Text style={styles.weatherCondition}>{weather.condition}</Text>
            <Text style={styles.weatherLoc}>📍 {weather.location}</Text>
          </View>
        </View>
        <View style={styles.weatherStats}>
          <View style={styles.statChip}>
            <Text style={styles.statIcon}>💧</Text>
            <Text style={styles.statVal}>{weather.humidity}%</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statIcon}>💨</Text>
            <Text style={styles.statVal}>{weather.wind_speed} km/h</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statIcon}>🌧</Text>
            <Text style={styles.statVal}>{weather.precipitation ?? 0} mm</Text>
          </View>
        </View>
      </View>
      {rainAlert && (
        <View style={styles.rainAlert}>
          <Ionicons name="warning-outline" size={14} color="#f97316" />
          <Text style={styles.rainAlertText}>
            Heavy rain may raise prices due to supply disruption
          </Text>
        </View>
      )}
    </LinearGradient>
  );
}

function SummaryBanner({ total, rising, falling }: { total: number; rising: number; falling: number }) {
  return (
    <View style={styles.summaryRow}>
      {[
        { label: 'Tracked', val: total, color: C.sky },
        { label: 'Rising ↑', val: rising, color: C.red },
        { label: 'Falling ↓', val: falling, color: C.green },
        { label: 'Stable →', val: total - rising - falling, color: C.amber },
      ].map(item => (
        <View key={item.label} style={styles.summaryChip}>
          <Text style={[styles.summaryNum, { color: item.color }]}>{item.val}</Text>
          <Text style={styles.summaryLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

export default function HomeScreen({ navigation }: any) {
  const { dashboard, isLoading, fetchDashboard } = usePriceStore();
  const [weather, setWeather] = useState<WeatherResponse | null>(null);

  const refresh = () => {
    fetchDashboard();
    api.getWeather().then(setWeather).catch(() => {});
  };

  useEffect(() => { refresh(); }, []);

  const rising = dashboard?.all_predictions.filter(p => p.trend === 'up').length ?? 0;
  const falling = dashboard?.all_predictions.filter(p => p.trend === 'down').length ?? 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={C.indigo} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Header */}
      <LinearGradient colors={['#0a1628', C.bg]} style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroTitle}>VegPrice AI</Text>
            <Text style={styles.heroSub}>Chennai Market Intelligence</Text>
          </View>
          <TouchableOpacity
            style={styles.aiBtn}
            onPress={() => navigation.navigate('Admin')}
          >
            <Ionicons name="settings-outline" size={20} color={C.indigo} />
          </TouchableOpacity>
        </View>
        {dashboard && (
          <Text style={styles.heroMeta}>
            Updated {dashboard.last_updated} · {dashboard.markets_tracked} markets
          </Text>
        )}
      </LinearGradient>

      {/* Weather */}
      {weather ? (
        <WeatherBanner weather={weather} />
      ) : (
        <View style={styles.weatherSkeleton}>
          <ActivityIndicator size="small" color={C.indigo} />
          <Text style={styles.skeletonText}>Loading Chennai weather...</Text>
        </View>
      )}

      {/* Summary chips */}
      {dashboard && (
        <SummaryBanner
          total={dashboard.total_vegetables}
          rising={rising}
          falling={falling}
        />
      )}

      {isLoading && !dashboard && (
        <ActivityIndicator size="large" color={C.indigo} style={{ marginTop: 60 }} />
      )}

      {dashboard && (
        <>
          {/* Top Rising */}
          {dashboard.top_rising.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: C.red }]} />
                <Text style={styles.sectionTitle}>Rising Tomorrow</Text>
              </View>
              {dashboard.top_rising.map(item => (
                <TouchableOpacity
                  key={item.vegetable}
                  onPress={() => navigation.navigate('Forecast', { vegetable: item.vegetable })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.trendCard, { borderColor: '#f43f5e30' }]}>
                    <Text style={styles.trendVeg}>
                      {item.vegetable.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </Text>
                    <View style={styles.trendRight}>
                      <Text style={[styles.trendPct, { color: C.red }]}>+{item.change_pct}%</Text>
                      <Text style={[styles.trendPrice, { color: C.red }]}>₹{item.predicted_price.toFixed(0)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Top Falling */}
          {dashboard.top_falling.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: C.green }]} />
                <Text style={styles.sectionTitle}>Falling Tomorrow</Text>
              </View>
              {dashboard.top_falling.map(item => (
                <TouchableOpacity
                  key={item.vegetable}
                  onPress={() => navigation.navigate('Forecast', { vegetable: item.vegetable })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.trendCard, { borderColor: '#10b98130' }]}>
                    <Text style={styles.trendVeg}>
                      {item.vegetable.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </Text>
                    <View style={styles.trendRight}>
                      <Text style={[styles.trendPct, { color: C.green }]}>{item.change_pct}%</Text>
                      <Text style={[styles.trendPrice, { color: C.green }]}>₹{item.predicted_price.toFixed(0)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* All Vegetables */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: C.indigo }]} />
              <Text style={styles.sectionTitle}>All Vegetables</Text>
            </View>
            {dashboard.all_predictions.map(pred => (
              <TouchableOpacity
                key={pred.vegetable}
                onPress={() => navigation.navigate('Forecast', { vegetable: pred.vegetable })}
                activeOpacity={0.7}
              >
                <PriceCard prediction={pred} compact />
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  hero: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroTitle: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  heroSub: { fontSize: 13, color: C.text2, marginTop: 2 },
  heroMeta: { fontSize: 11, color: C.text3, marginTop: 10 },
  aiBtn: {
    backgroundColor: '#6366f115', borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: '#6366f130',
  },
  weatherCard: {
    marginHorizontal: 16, marginBottom: 12, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  weatherTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weatherMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weatherEmoji: { fontSize: 40 },
  weatherTemp: { fontSize: 30, fontWeight: '800', color: C.text },
  weatherCondition: { fontSize: 13, color: C.sky, marginTop: 2 },
  weatherLoc: { fontSize: 11, color: C.text3, marginTop: 2 },
  weatherStats: { gap: 6 },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statIcon: { fontSize: 12 },
  statVal: { color: C.text2, fontSize: 12, fontWeight: '500' },
  rainAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, backgroundColor: '#f9731615', borderRadius: 8, padding: 8,
    borderLeftWidth: 3, borderLeftColor: '#f97316',
  },
  rainAlertText: { color: '#fed7aa', fontSize: 12, flex: 1 },
  weatherSkeleton: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 12, backgroundColor: C.card,
    borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border,
  },
  skeletonText: { color: C.text3, fontSize: 13 },
  summaryRow: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, gap: 8,
  },
  summaryChip: {
    flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  summaryNum: { fontSize: 22, fontWeight: '800' },
  summaryLabel: { color: C.text3, fontSize: 10, marginTop: 2, textAlign: 'center' },
  section: { marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  sectionDot: { width: 6, height: 6, borderRadius: 3 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: 0.2 },
  trendCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16,
    marginHorizontal: 16, marginBottom: 6, borderWidth: 1,
  },
  trendVeg: { color: C.text, fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  trendRight: { alignItems: 'flex-end' },
  trendPct: { fontSize: 15, fontWeight: '700' },
  trendPrice: { fontSize: 12, marginTop: 1 },
});
