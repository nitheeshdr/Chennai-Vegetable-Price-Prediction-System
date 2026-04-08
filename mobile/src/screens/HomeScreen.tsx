import React, { useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { usePriceStore } from '../store/priceStore';
import PriceCard from '../components/PriceCard';

export default function HomeScreen({ navigation }: any) {
  const { dashboard, isLoading, fetchDashboard } = usePriceStore();

  useEffect(() => { fetchDashboard(); }, []);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchDashboard} tintColor="#22c55e" />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Chennai Vegetable Prices</Text>
        <Text style={styles.subtitle}>Next-day predictions powered by AI</Text>
        {dashboard && (
          <Text style={styles.meta}>
            {dashboard.total_vegetables} vegetables tracked • Updated {dashboard.last_updated}
          </Text>
        )}
      </View>

      {isLoading && !dashboard && <ActivityIndicator size="large" color="#22c55e" style={{ marginTop: 40 }} />}

      {dashboard && (
        <>
          {/* Top Rising */}
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

          {/* Top Falling */}
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

          {/* All predictions */}
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
