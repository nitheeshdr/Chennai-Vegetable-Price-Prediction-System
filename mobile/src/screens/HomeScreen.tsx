import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { usePriceStore } from '../store/priceStore';
import PriceCard from '../components/PriceCard';
import { api, WeatherResponse } from '../services/api';

function weatherEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 2) return '⛅';
  if (code === 3) return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 82) return '🌦️';
  return '⛈️';
}

function WeatherBanner({ weather }: { weather: WeatherResponse }) {
  const emoji = weatherEmoji(weather.weather_code);
  const rainAlert = weather.precipitation > 5;
  return (
    <View style={styles.weatherCard}>
      <View style={styles.weatherLeft}>
        <Text style={styles.weatherEmoji}>{emoji}</Text>
        <View>
          <Text style={styles.weatherTemp}>{weather.temperature}°C</Text>
          <Text style={styles.weatherCondition}>{weather.condition}</Text>
        </View>
      </View>
      <View style={styles.weatherRight}>
        <Text style={styles.weatherStat}>💧 {weather.humidity}%</Text>
        <Text style={styles.weatherStat}>💨 {weather.wind_speed} km/h</Text>
        <Text style={styles.weatherStat}>🌧 {weather.precipitation} mm</Text>
      </View>
      {rainAlert && (
        <View style={styles.weatherAlert}>
          <Text style={styles.weatherAlertText}>
            ⚠️ Heavy rain may raise vegetable prices due to supply disruption
          </Text>
        </View>
      )}
    </View>
  );
}

export default function HomeScreen({ navigation }: any) {
  const { dashboard, isLoading, fetchDashboard } = usePriceStore();
  const [weather, setWeather] = useState<WeatherResponse | null>(null);

  useEffect(() => {
    fetchDashboard();
    api.getWeather().then(setWeather).catch(() => {});
  }, []);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => {
            fetchDashboard();
            api.getWeather().then(setWeather).catch(() => {});
          }}
          tintColor="#22c55e"
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Chennai Vegetable Prices</Text>
        <Text style={styles.subtitle}>Next-day predictions powered by AI</Text>
        {dashboard && (
          <Text style={styles.meta}>
            {dashboard.total_vegetables} vegetables • Updated {dashboard.last_updated}
          </Text>
        )}
      </View>

      {/* Weather Banner */}
      {weather && <WeatherBanner weather={weather} />}

      {isLoading && !dashboard && (
        <ActivityIndicator size="large" color="#22c55e" style={{ marginTop: 40 }} />
      )}

      {dashboard && (
        <>
          {dashboard.top_rising.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>↑ Rising Tomorrow</Text>
              {dashboard.top_rising.map((item) => (
                <TouchableOpacity
                  key={item.vegetable}
                  onPress={() => navigation.navigate('Forecast', { vegetable: item.vegetable })}
                >
                  <View style={styles.alertCard}>
                    <Text style={styles.alertVeg}>{item.vegetable.replace(/_/g, ' ')}</Text>
                    <Text style={styles.alertChange}>+{item.change_pct}%</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {dashboard.top_falling.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>↓ Falling Tomorrow</Text>
              {dashboard.top_falling.map((item) => (
                <TouchableOpacity
                  key={item.vegetable}
                  onPress={() => navigation.navigate('Forecast', { vegetable: item.vegetable })}
                >
                  <View style={[styles.alertCard, styles.fallingCard]}>
                    <Text style={styles.alertVeg}>{item.vegetable.replace(/_/g, ' ')}</Text>
                    <Text style={[styles.alertChange, styles.fallingChange]}>{item.change_pct}%</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All Vegetables</Text>
            {dashboard.all_predictions.map((pred) => (
              <TouchableOpacity
                key={pred.vegetable}
                onPress={() => navigation.navigate('Forecast', { vegetable: pred.vegetable })}
              >
                <PriceCard prediction={pred} />
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 20, paddingTop: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#f9fafb' },
  subtitle: { fontSize: 14, color: '#9ca3af', marginTop: 4 },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 8 },

  // Weather
  weatherCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#1e3a5f',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2563eb33',
    flexWrap: 'wrap',
  },
  weatherLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  weatherEmoji: { fontSize: 36 },
  weatherTemp: { fontSize: 28, fontWeight: 'bold', color: '#f9fafb' },
  weatherCondition: { fontSize: 13, color: '#93c5fd', marginTop: 2 },
  weatherRight: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  weatherStat: { fontSize: 13, color: '#cbd5e1' },
  weatherAlert: {
    marginTop: 10,
    backgroundColor: '#7c2d1230',
    borderRadius: 8,
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f97316',
    width: '100%',
  },
  weatherAlertText: { color: '#fed7aa', fontSize: 12 },

  // Sections
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#e5e7eb', marginBottom: 10 },
  alertCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
  },
  fallingCard: { borderLeftColor: '#ef4444' },
  alertVeg: { color: '#e5e7eb', fontSize: 15, textTransform: 'capitalize' },
  alertChange: { color: '#22c55e', fontWeight: 'bold', fontSize: 16 },
  fallingChange: { color: '#ef4444' },
});
