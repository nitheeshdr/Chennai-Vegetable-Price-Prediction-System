import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Surface, Text, Card, Button, TextInput, Chip,
  List, Divider, IconButton, SegmentedButtons,
  ActivityIndicator, Snackbar,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';
import { C } from '../theme';

const VEGETABLES = [
  'tomato', 'onion', 'potato', 'brinjal', 'ladies_finger',
  'carrot', 'cabbage', 'beans', 'green_chilli', 'ginger',
  'garlic', 'cauliflower',
];
const USER_ID = 'demo-user-001';

export default function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const [alerts,      setAlerts]      = useState<any[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [selectedVeg, setSelectedVeg] = useState('tomato');
  const [threshold,   setThreshold]   = useState('');
  const [direction,   setDirection]   = useState<'above' | 'below'>('above');
  const [creating,    setCreating]    = useState(false);
  const [snack,       setSnack]       = useState('');

  const loadAlerts = async () => {
    setLoading(true);
    try { setAlerts(await api.getAlerts(USER_ID)); }
    catch { setAlerts([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadAlerts(); }, []);

  const createAlert = async () => {
    if (!threshold || isNaN(Number(threshold))) {
      Alert.alert('Invalid Input', 'Please enter a valid price threshold.');
      return;
    }
    setCreating(true);
    try {
      await api.createAlert({
        user_id:         USER_ID,
        vegetable_name:  selectedVeg,
        threshold_price: Number(threshold),
        direction,
      });
      setThreshold('');
      await loadAlerts();
      setSnack(`Alert set for ${selectedVeg} ${direction} ₹${threshold}`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteAlert = (id: string, name: string) => {
    Alert.alert('Remove Alert', `Delete alert for ${name.replace(/_/g, ' ')}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await api.deleteAlert(id);
          loadAlerts();
          setSnack('Alert removed');
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* App Bar */}
      <Surface style={styles.appbar} elevation={0}>
        <Text variant="headlineMedium" style={styles.appTitle}>Price Alerts</Text>
        <Text variant="labelMedium" style={{ color: C.text3 }}>Get notified when prices change</Text>
      </Surface>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Create Alert Card */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="bell-plus" size={18} color={C.primary} />
              <Text variant="titleMedium" style={styles.cardTitle}>Create Alert</Text>
            </View>

            {/* Vegetable picker */}
            <Text variant="labelMedium" style={styles.fieldLabel}>Vegetable</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vegScroll} contentContainerStyle={styles.vegRow}>
              {VEGETABLES.map(v => (
                <Chip
                  key={v}
                  selected={selectedVeg === v}
                  onPress={() => setSelectedVeg(v)}
                  style={[styles.vegChip, { backgroundColor: selectedVeg === v ? `${C.primary}30` : C.surface2 }]}
                  textStyle={{ color: selectedVeg === v ? C.primary : C.text2, fontSize: 12, fontWeight: selectedVeg === v ? '700' : '400' }}
                  showSelectedCheck={false}
                  compact
                >
                  {v.replace(/_/g, ' ')}
                </Chip>
              ))}
            </ScrollView>

            {/* Direction toggle */}
            <Text variant="labelMedium" style={styles.fieldLabel}>Alert when price is</Text>
            <SegmentedButtons
              value={direction}
              onValueChange={v => setDirection(v as 'above' | 'below')}
              style={{ marginBottom: 16 }}
              buttons={[
                {
                  value: 'above',
                  label: 'Above ↑',
                  icon: 'trending-up',
                  style: { backgroundColor: direction === 'above' ? `${C.red}25` : C.surface2 },
                },
                {
                  value: 'below',
                  label: 'Below ↓',
                  icon: 'trending-down',
                  style: { backgroundColor: direction === 'below' ? `${C.green}25` : C.surface2 },
                },
              ]}
            />

            {/* Price input */}
            <TextInput
              label="Threshold Price (₹/kg)"
              value={threshold}
              onChangeText={setThreshold}
              keyboardType="numeric"
              mode="outlined"
              left={<TextInput.Affix text="₹" textStyle={{ color: C.primary }} />}
              style={styles.input}
              outlineColor={C.border}
              activeOutlineColor={C.primary}
              textColor={C.text}
              theme={{ colors: { onSurfaceVariant: C.text3, surface: C.surface2 } }}
            />

            <Button
              mode="contained"
              onPress={createAlert}
              loading={creating}
              disabled={creating}
              icon="bell-plus"
              style={styles.createBtn}
              contentStyle={{ paddingVertical: 6 }}
            >
              Set Alert
            </Button>
          </Card.Content>
        </Card>

        {/* Active Alerts */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="bell" size={18} color={C.amber} />
              <Text variant="titleMedium" style={styles.cardTitle}>
                Active Alerts
              </Text>
              <View style={styles.badge}>
                <Text variant="labelSmall" style={{ color: C.primary, fontWeight: '800' }}>
                  {alerts.length}
                </Text>
              </View>
            </View>

            {loading && (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <ActivityIndicator size="small" color={C.primary} />
              </View>
            )}

            {!loading && alerts.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="bell-off-outline" size={48} color={C.text3} />
                <Text variant="bodyMedium" style={{ color: C.text3, marginTop: 10, textAlign: 'center' }}>
                  No active alerts.{'\n'}Create one above to get notified.
                </Text>
              </View>
            )}

            {!loading && alerts.map((alert, idx) => {
              const dir   = alert.direction === 'above';
              const color = dir ? C.red : C.green;
              const name  = alert.vegetable_name.replace(/_/g, ' ');
              return (
                <View key={alert.id}>
                  <List.Item
                    title={name.replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    description={`${dir ? '↑ Above' : '↓ Below'} ₹${alert.threshold_price}/kg${alert.market_name ? ` · ${alert.market_name}` : ''}`}
                    titleStyle={{ color: C.text, fontWeight: '600', textTransform: 'capitalize' }}
                    descriptionStyle={{ color, fontWeight: '600', marginTop: 2 }}
                    left={() => (
                      <View style={[styles.alertDot, { backgroundColor: `${color}25` }]}>
                        <MaterialCommunityIcons name={dir ? 'trending-up' : 'trending-down'} size={16} color={color} />
                      </View>
                    )}
                    right={() => (
                      <IconButton
                        icon="trash-can-outline"
                        iconColor={C.red}
                        size={18}
                        onPress={() => deleteAlert(alert.id, alert.vegetable_name)}
                      />
                    )}
                    style={{ paddingHorizontal: 0, paddingVertical: 2 }}
                  />
                  {idx < alerts.length - 1 && <Divider style={{ backgroundColor: C.border }} />}
                </View>
              );
            })}
          </Card.Content>
        </Card>

        <View style={{ height: 32 }} />
      </ScrollView>

      <Snackbar
        visible={!!snack}
        onDismiss={() => setSnack('')}
        duration={3000}
        style={{ backgroundColor: C.surface2 }}
      >
        {snack}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  appbar:    { backgroundColor: C.surface, paddingHorizontal: 20, paddingBottom: 16, paddingTop: 12 },
  appTitle:  { color: C.text, fontWeight: '800' },

  card:       { marginHorizontal: 16, marginBottom: 12, backgroundColor: C.surface, borderRadius: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle:  { color: C.text, fontWeight: '700', flex: 1 },

  fieldLabel: { color: C.text3, marginBottom: 8, marginTop: 4 },
  vegScroll:  { marginBottom: 16 },
  vegRow:     { gap: 8, paddingRight: 8 },
  vegChip:    { borderRadius: 20 },

  input:     { backgroundColor: C.surface2, marginBottom: 16 },
  createBtn: { borderRadius: 14 },

  badge: {
    backgroundColor: `${C.primary}25`,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 4,
  },

  emptyState: { alignItems: 'center', paddingVertical: 24 },

  alertDot: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 4, alignSelf: 'center' },
});
