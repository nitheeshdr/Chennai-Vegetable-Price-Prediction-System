import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { api } from '../services/api';

const VEGETABLES = [
  'tomato', 'onion', 'potato', 'brinjal', 'ladies_finger',
  'carrot', 'cabbage', 'beans', 'green_chilli', 'ginger',
];
const USER_ID = 'demo-user-001'; // In production, use device UUID or auth ID

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVeg, setSelectedVeg] = useState('tomato');
  const [threshold, setThreshold] = useState('');
  const [direction, setDirection] = useState<'above' | 'below'>('above');

  const loadAlerts = async () => {
    setLoading(true);
    try { setAlerts(await api.getAlerts(USER_ID)); }
    catch { setAlerts([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAlerts(); }, []);

  const createAlert = async () => {
    if (!threshold || isNaN(Number(threshold))) {
      Alert.alert('Invalid', 'Enter a valid price threshold');
      return;
    }
    try {
      await api.createAlert({
        user_id: USER_ID,
        vegetable_name: selectedVeg,
        threshold_price: Number(threshold),
        direction,
      });
      setThreshold('');
      loadAlerts();
      Alert.alert('Alert Created', `You'll be notified when ${selectedVeg} is ${direction} ₹${threshold}`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const deleteAlert = async (id: string) => {
    Alert.alert('Delete Alert', 'Remove this price alert?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await api.deleteAlert(id);
          loadAlerts();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Create alert form */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create Price Alert</Text>
        <Text style={styles.label}>Vegetable</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vegPicker}>
          {VEGETABLES.map((v) => (
            <TouchableOpacity
              key={v}
              style={[styles.vegChip, selectedVeg === v && styles.vegChipActive]}
              onPress={() => setSelectedVeg(v)}
            >
              <Text style={[styles.vegChipText, selectedVeg === v && styles.vegChipTextActive]}>
                {v.replace(/_/g, ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Alert when price is</Text>
        <View style={styles.directionRow}>
          {(['above', 'below'] as const).map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.dirBtn, direction === d && styles.dirBtnActive]}
              onPress={() => setDirection(d)}
            >
              <Text style={[styles.dirBtnText, direction === d && styles.dirBtnTextActive]}>
                {d === 'above' ? '↑ Above' : '↓ Below'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Threshold Price (₹/kg)</Text>
        <TextInput
          style={styles.input}
          value={threshold}
          onChangeText={setThreshold}
          keyboardType="numeric"
          placeholder="e.g. 50"
          placeholderTextColor="#6b7280"
        />

        <TouchableOpacity style={styles.createBtn} onPress={createAlert}>
          <Text style={styles.createBtnText}>Set Alert</Text>
        </TouchableOpacity>
      </View>

      {/* Existing alerts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Alerts ({alerts.length})</Text>
        {loading && <ActivityIndicator color="#22c55e" />}
        {!loading && alerts.length === 0 && (
          <Text style={styles.empty}>No active alerts. Create one above.</Text>
        )}
        {alerts.map((alert) => (
          <View key={alert.id} style={styles.alertRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertVeg}>{alert.vegetable_name.replace(/_/g, ' ')}</Text>
              <Text style={styles.alertMeta}>
                {alert.direction === 'above' ? '↑' : '↓'} ₹{alert.threshold_price}/kg
                {alert.market_name ? ` • ${alert.market_name}` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => deleteAlert(alert.id)} style={styles.delBtn}>
              <Text style={styles.delBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  card: { backgroundColor: '#1e293b', borderRadius: 16, margin: 16, padding: 20 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#f9fafb', marginBottom: 16 },
  label: { color: '#9ca3af', fontSize: 13, marginBottom: 8, marginTop: 12 },
  vegPicker: { marginBottom: 4 },
  vegChip: {
    paddingHorizontal: 14, paddingVertical: 7, marginRight: 8,
    borderRadius: 20, backgroundColor: '#374151',
  },
  vegChipActive: { backgroundColor: '#22c55e' },
  vegChipText: { color: '#9ca3af', fontSize: 13 },
  vegChipTextActive: { color: '#fff', fontWeight: '600' },
  directionRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  dirBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    backgroundColor: '#374151', alignItems: 'center',
  },
  dirBtnActive: { backgroundColor: '#16a34a' },
  dirBtnText: { color: '#9ca3af', fontWeight: '600' },
  dirBtnTextActive: { color: '#fff' },
  input: {
    backgroundColor: '#374151', borderRadius: 8, padding: 12,
    color: '#f9fafb', fontSize: 16,
  },
  createBtn: {
    backgroundColor: '#22c55e', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 16,
  },
  createBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { color: '#e5e7eb', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 20 },
  alertRow: {
    backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center',
  },
  alertVeg: { color: '#e5e7eb', fontSize: 15, textTransform: 'capitalize', fontWeight: '600' },
  alertMeta: { color: '#9ca3af', fontSize: 13, marginTop: 2 },
  delBtn: {
    backgroundColor: '#374151', borderRadius: 8, padding: 10,
  },
  delBtnText: { color: '#ef4444', fontWeight: 'bold' },
});
