import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { ScanResponse } from '../services/api';
import PriceCard from '../components/PriceCard';
import ConfidenceBar from '../components/ConfidenceBar';

export default function ResultScreen({ route, navigation }: any) {
  const { scanResult } = route.params as { scanResult: ScanResponse };
  const { vegetable_detected, confidence, top_k, prediction, current_price } = scanResult;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>
          {vegetable_detected !== 'unknown'
            ? vegetable_detected.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
            : 'Unknown Vegetable'}
        </Text>
        <ConfidenceBar confidence={confidence} />
        {top_k.length > 1 && (
          <View style={styles.topK}>
            <Text style={styles.subLabel}>Other possibilities:</Text>
            {top_k.slice(1, 3).map((item) => (
              <Text key={item.vegetable} style={styles.altVeg}>
                {item.vegetable.replace(/_/g, ' ')} ({(item.confidence * 100).toFixed(1)}%)
              </Text>
            ))}
          </View>
        )}
      </View>

      {current_price && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Current Price</Text>
          <Text style={styles.price}>₹{current_price.modal_price.toFixed(0)}/kg</Text>
          {current_price.market_name && (
            <Text style={styles.market}>at {current_price.market_name}</Text>
          )}
          {current_price.min_price && current_price.max_price && (
            <Text style={styles.range}>
              Range: ₹{current_price.min_price.toFixed(0)} – ₹{current_price.max_price.toFixed(0)}/kg
            </Text>
          )}
        </View>
      )}

      {prediction && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Tomorrow's Prediction</Text>
          <PriceCard prediction={prediction} />
          <View style={styles.confidenceSection}>
            <Text style={styles.ciLabel}>
              Confidence Interval: ₹{prediction.confidence_lower.toFixed(0)} – ₹{prediction.confidence_upper.toFixed(0)}
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.forecastBtn}
        onPress={() => navigation.navigate('Forecast', { vegetable: vegetable_detected })}
      >
        <Text style={styles.forecastBtnText}>View 7-Day Forecast →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  card: {
    backgroundColor: '#1e293b', borderRadius: 16,
    margin: 16, padding: 20,
  },
  title: {
    fontSize: 28, fontWeight: 'bold', color: '#f9fafb',
    textAlign: 'center', marginBottom: 12,
  },
  topK: { marginTop: 12 },
  subLabel: { color: '#9ca3af', fontSize: 13, marginBottom: 4 },
  altVeg: { color: '#d1d5db', fontSize: 14, marginLeft: 8 },
  sectionTitle: { color: '#9ca3af', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  price: { fontSize: 36, fontWeight: 'bold', color: '#22c55e' },
  market: { color: '#9ca3af', fontSize: 14, marginTop: 4 },
  range: { color: '#6b7280', fontSize: 13, marginTop: 4 },
  confidenceSection: { marginTop: 12 },
  ciLabel: { color: '#9ca3af', fontSize: 13 },
  forecastBtn: {
    backgroundColor: '#22c55e', margin: 16, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  forecastBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
