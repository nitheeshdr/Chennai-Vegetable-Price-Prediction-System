import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { api } from '../services/api';

const VEGETABLES = [
  'tomato', 'onion', 'potato', 'brinjal', 'ladies_finger',
  'carrot', 'cabbage', 'beans', 'bitter_gourd', 'green_chilli',
];
const W = Dimensions.get('window').width;

export default function TrendsScreen({ navigation }: any) {
  const [selected, setSelected] = useState('tomato');
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getWeeklyForecast(selected)
      .then(setForecast)
      .catch(() => setForecast(null))
      .finally(() => setLoading(false));
  }, [selected]);

  const chartData = forecast?.forecast
    ? {
        labels: forecast.forecast.map((f: any) => f.prediction_date.slice(5)),
        datasets: [{ data: forecast.forecast.map((f: any) => f.predicted_price) }],
      }
    : null;

  return (
    <ScrollView style={styles.container}>
      {/* Vegetable selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.picker}>
        {VEGETABLES.map((veg) => (
          <TouchableOpacity
            key={veg}
            style={[styles.vegBtn, selected === veg && styles.vegBtnActive]}
            onPress={() => setSelected(veg)}
          >
            <Text style={[styles.vegBtnText, selected === veg && styles.vegBtnTextActive]}>
              {veg.replace(/_/g, ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.chartTitle}>
        7-Day Forecast: {selected.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
      </Text>

      {loading && <ActivityIndicator color="#22c55e" style={{ margin: 40 }} />}

      {chartData && !loading && (
        <LineChart
          data={chartData}
          width={W - 32}
          height={220}
          chartConfig={{
            backgroundColor: '#1e293b',
            backgroundGradientFrom: '#1e293b',
            backgroundGradientTo: '#0f172a',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
            labelColor: () => '#9ca3af',
            propsForDots: { r: '5', strokeWidth: '2', stroke: '#22c55e' },
          }}
          bezier
          style={styles.chart}
        />
      )}

      {forecast?.forecast && !loading && (
        <View style={styles.table}>
          {forecast.forecast.map((item: any) => (
            <View key={item.prediction_date} style={styles.row}>
              <Text style={styles.dateText}>{item.prediction_date}</Text>
              <Text style={styles.priceText}>₹{item.predicted_price.toFixed(0)}</Text>
              <Text style={[
                styles.trendText,
                item.trend === 'up' ? styles.trendUp : item.trend === 'down' ? styles.trendDown : styles.trendStable,
              ]}>
                {item.trend_emoji}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  picker: { paddingHorizontal: 12, paddingVertical: 12 },
  vegBtn: {
    paddingHorizontal: 16, paddingVertical: 8, marginRight: 8,
    borderRadius: 20, backgroundColor: '#1e293b',
  },
  vegBtnActive: { backgroundColor: '#22c55e' },
  vegBtnText: { color: '#9ca3af', fontSize: 13 },
  vegBtnTextActive: { color: '#fff', fontWeight: '600' },
  chartTitle: {
    color: '#e5e7eb', fontSize: 16, fontWeight: '600',
    paddingHorizontal: 16, marginBottom: 8,
  },
  chart: { marginHorizontal: 16, borderRadius: 12 },
  table: { margin: 16, backgroundColor: '#1e293b', borderRadius: 12, overflow: 'hidden' },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 14,
    borderBottomWidth: 1, borderBottomColor: '#374151',
  },
  dateText: { color: '#d1d5db', fontSize: 13 },
  priceText: { color: '#f9fafb', fontSize: 15, fontWeight: '600' },
  trendText: { fontSize: 18 },
  trendUp: { color: '#22c55e' },
  trendDown: { color: '#ef4444' },
  trendStable: { color: '#f59e0b' },
});
