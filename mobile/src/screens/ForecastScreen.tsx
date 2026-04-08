import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { api, WeeklyForecastResponse } from '../services/api';
import PriceCard from '../components/PriceCard';

export default function ForecastScreen({ route }: any) {
  const { vegetable } = route.params as { vegetable: string };
  const [forecast, setForecast] = useState<WeeklyForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getWeeklyForecast(vegetable)
      .then(setForecast)
      .catch(() => setForecast(null))
      .finally(() => setLoading(false));
  }, [vegetable]);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#22c55e" />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>
        {vegetable.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
      </Text>
      <Text style={styles.subtitle}>7-Day Price Forecast</Text>
      {forecast?.forecast.map((pred, i) => (
        <PriceCard key={pred.prediction_date} prediction={pred} index={i} />
      ))}
      {!forecast && (
        <Text style={styles.empty}>No forecast available for {vegetable}.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#f9fafb', margin: 16, marginBottom: 4 },
  subtitle: { color: '#9ca3af', fontSize: 14, marginLeft: 16, marginBottom: 12 },
  empty: { color: '#9ca3af', textAlign: 'center', marginTop: 40, fontSize: 15 },
});
