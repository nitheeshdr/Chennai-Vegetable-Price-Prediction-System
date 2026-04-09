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
import { useC } from '../context/ThemeContext';
import { SP, SHAPE } from '../theme';

const VEGETABLES = [
  'tomato', 'onion', 'potato', 'brinjal', 'ladies_finger',
  'carrot', 'cabbage', 'beans', 'green_chilli', 'ginger',
  'garlic', 'cauliflower',
];
const USER_ID = 'demo-user-001';

export default function AlertsScreen() {
  const C      = useC();
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
      await api.createAlert({ user_id: USER_ID, vegetable_name: selectedVeg, threshold_price: Number(threshold), direction });
      setThreshold('');
      await loadAlerts();
      setSnack(`Alert set: ${selectedVeg.replace(/_/g,' ')} ${direction} ₹${threshold}/kg`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally { setCreating(false); }
  };

  const deleteAlert = (id: string, name: string) => {
    Alert.alert('Remove Alert', `Delete alert for ${name.replace(/_/g, ' ')}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await api.deleteAlert(id); loadAlerts(); setSnack('Alert removed'); } },
    ]);
  };

  return (
    <View style={[s.root, { paddingTop: insets.top, backgroundColor: C.bg }]}>
      <Surface style={[s.topBar, { backgroundColor: C.surface }]} elevation={0}>
        <Text variant="headlineMedium" style={[s.appTitle, { color: C.text }]}>Price Alerts</Text>
        <Text variant="labelMedium"    style={{ color: C.text3, marginTop: SP.xs }}>
          Get notified when prices change
        </Text>
      </Surface>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: SP.huge }}>

        <Card style={[s.card, { backgroundColor: C.surface }]}>
          <Card.Content>
            <View style={s.cardHead}>
              <MaterialCommunityIcons name="bell-plus" size={18} color={C.primary} />
              <Text variant="titleMedium" style={[s.cardTitle, { color: C.text }]}>Create Alert</Text>
            </View>

            <Text variant="labelMedium" style={[s.fieldLabel, { color: C.text3 }]}>Vegetable</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: SP.sm, paddingBottom: SP.sm }}>
              {VEGETABLES.map(v => (
                <Chip key={v} selected={selectedVeg === v} onPress={() => setSelectedVeg(v)}
                  showSelectedCheck={false} compact
                  style={[s.vegChip, { backgroundColor: selectedVeg === v ? `${C.primary}28` : C.surface2 }]}
                  textStyle={{ color: selectedVeg === v ? C.primary : C.text2, fontSize: 12, fontWeight: selectedVeg === v ? '700' : '400' }}>
                  {v.replace(/_/g, ' ')}
                </Chip>
              ))}
            </ScrollView>

            <Text variant="labelMedium" style={[s.fieldLabel, { color: C.text3 }]}>Alert when price is</Text>
            <SegmentedButtons value={direction} onValueChange={v => setDirection(v as 'above' | 'below')}
              style={{ marginBottom: SP.lg }}
              buttons={[
                { value: 'above', label: 'Above ↑', icon: 'trending-up',
                  style: { backgroundColor: direction === 'above' ? `${C.red}20` : C.surface2 } },
                { value: 'below', label: 'Below ↓', icon: 'trending-down',
                  style: { backgroundColor: direction === 'below' ? `${C.green}20` : C.surface2 } },
              ]}
            />

            <TextInput label="Threshold Price" value={threshold} onChangeText={setThreshold}
              keyboardType="numeric" mode="outlined"
              left={<TextInput.Affix text="₹" textStyle={{ color: C.primary }} />}
              right={<TextInput.Affix text="/kg" textStyle={{ color: C.text3 }} />}
              style={[s.input, { backgroundColor: C.surface2 }]}
              outlineColor={C.border} activeOutlineColor={C.primary}
              textColor={C.text}
              theme={{ colors: { onSurfaceVariant: C.text3 } }}
            />

            <Button mode="contained" onPress={createAlert} loading={creating} disabled={creating}
              icon="bell-plus" style={s.createBtn} contentStyle={{ paddingVertical: SP.sm }}>
              Set Alert
            </Button>
          </Card.Content>
        </Card>

        <Card style={[s.card, { backgroundColor: C.surface }]}>
          <Card.Content>
            <View style={s.cardHead}>
              <MaterialCommunityIcons name="bell" size={18} color={C.amber} />
              <Text variant="titleMedium" style={[s.cardTitle, { color: C.text }]}>Active Alerts</Text>
              {alerts.length > 0 && (
                <View style={[s.countBadge, { backgroundColor: `${C.primary}20` }]}>
                  <Text variant="labelSmall" style={{ color: C.primary, fontWeight: '800' }}>{alerts.length}</Text>
                </View>
              )}
            </View>

            {loading && <View style={{ alignItems: 'center', paddingVertical: SP.xxl }}><ActivityIndicator size="small" color={C.primary} /></View>}

            {!loading && alerts.length === 0 && (
              <View style={s.emptyState}>
                <MaterialCommunityIcons name="bell-off-outline" size={48} color={C.text3} />
                <Text variant="bodyMedium" style={{ color: C.text3, marginTop: SP.md, textAlign: 'center' }}>
                  No active alerts.{'\n'}Create one above to get notified.
                </Text>
              </View>
            )}

            {!loading && alerts.map((alert, idx) => {
              const isAbove = alert.direction === 'above';
              const color   = isAbove ? C.red : C.green;
              const name    = alert.vegetable_name.replace(/_/g, ' ');
              return (
                <View key={alert.id}>
                  <List.Item
                    title={name.replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    description={`${isAbove ? '↑ Above' : '↓ Below'} ₹${alert.threshold_price}/kg${alert.market_name ? ` · ${alert.market_name}` : ''}`}
                    titleStyle={{ color: C.text, fontWeight: '600', textTransform: 'capitalize' }}
                    descriptionStyle={{ color, fontWeight: '600', marginTop: 2 }}
                    left={() => (
                      <View style={[s.alertIcon, { backgroundColor: `${color}20` }]}>
                        <MaterialCommunityIcons name={isAbove ? 'trending-up' : 'trending-down'} size={16} color={color} />
                      </View>
                    )}
                    right={() => (
                      <IconButton icon="trash-can-outline" iconColor={C.red} size={18}
                        onPress={() => deleteAlert(alert.id, alert.vegetable_name)}
                        style={{ margin: 0, alignSelf: 'center' }} />
                    )}
                    style={{ paddingHorizontal: 0, paddingVertical: SP.xs }}
                    contentStyle={{ marginLeft: 0 }}
                  />
                  {idx < alerts.length - 1 && <Divider style={{ backgroundColor: C.border }} />}
                </View>
              );
            })}
          </Card.Content>
        </Card>
      </ScrollView>

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}
        style={{ backgroundColor: C.surface2, marginBottom: SP.sm }}>
        {snack}
      </Snackbar>
    </View>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1 },
  topBar:    { paddingHorizontal: SP.lg, paddingTop: SP.md, paddingBottom: SP.lg },
  appTitle:  { fontWeight: '800' },
  card:      { marginHorizontal: SP.lg, marginBottom: SP.md, borderRadius: SHAPE.xl },
  cardHead:  { flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginBottom: SP.lg },
  cardTitle: { fontWeight: '700', flex: 1 },
  fieldLabel: { marginBottom: SP.sm, marginTop: SP.xs },
  vegChip:   { borderRadius: SHAPE.full },
  input:     { marginBottom: SP.lg },
  createBtn: { borderRadius: SHAPE.lg },
  countBadge: { borderRadius: SHAPE.full, paddingHorizontal: SP.sm, paddingVertical: 2 },
  emptyState: { alignItems: 'center', paddingVertical: SP.xxl },
  alertIcon:  { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginRight: SP.xs },
});
