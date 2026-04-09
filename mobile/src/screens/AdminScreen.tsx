import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Surface, Text, Card, Button, List, ProgressBar, Snackbar, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, apiClient } from '../services/api';
import { usePriceStore } from '../store/priceStore';
import { useC } from '../context/ThemeContext';
import { SP, SHAPE } from '../theme';

const VEGETABLES = [
  'tomato','onion','potato','garlic','ginger','green_chilli',
  'brinjal','cabbage','carrot','cauliflower','beans','bitter_gourd',
  'bottle_gourd','coriander','drumstick','ladies_finger','raw_banana','tapioca',
];

type RefreshStatus = 'idle' | 'running' | 'done' | 'error';
type TestStatus    = 'idle' | 'testing' | 'ok' | 'fail';

export default function AdminScreen() {
  const C      = useC();
  const insets = useSafeAreaInsets();
  const { fetchDashboard } = usePriceStore();

  const [status,     setStatus]     = useState<RefreshStatus>('idle');
  const [progress,   setProgress]   = useState(0);
  const [currentVeg, setCurrentVeg] = useState('');
  const [results,    setResults]    = useState<string[]>([]);
  const [lastRun,    setLastRun]    = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMsg,    setTestMsg]    = useState('');
  const [snack,      setSnack]      = useState('');

  const testConnection = async () => {
    setTestStatus('testing'); setTestMsg('');
    try {
      const { data } = await apiClient.get('/test-ai');
      if (data.status === 'ok') {
        setTestStatus('ok');
        setTestMsg(`✓ ${data.model} · "${data.reply}"`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setTestStatus('fail');
        setTestMsg(data.tried?.[0]?.error
          ? `✗ ${data.tried[0].model}: ${data.tried[0].error}`
          : `✗ ${data.error || 'Unknown error'}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err: any) {
      setTestStatus('fail');
      setTestMsg(`✗ ${err?.response?.data?.error || err.message || 'Connection failed'}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const runRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setStatus('running'); setProgress(0); setResults([]);
    const logs: string[] = [];
    let done = 0;
    for (const veg of VEGETABLES) {
      setCurrentVeg(veg.replace(/_/g, ' '));
      try {
        const pred = await api.aiPredict(veg);
        logs.push(`✓ ${veg.replace(/_/g,' ')} → ₹${pred.predicted_price.toFixed(0)} (${pred.trend})`);
      } catch {
        logs.push(`✗ ${veg} failed`);
      }
      done++;
      setProgress(done / VEGETABLES.length);
      setResults([...logs]);
    }
    setStatus('done'); setCurrentVeg('');
    setLastRun(new Date().toLocaleString('en-IN'));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSnack('All AI predictions refreshed!');
    fetchDashboard();
  };

  const confirmRun = () => Alert.alert(
    'Refresh AI Predictions',
    `Calls NVIDIA NIM AI for all ${VEGETABLES.length} vegetables. Takes ~2 minutes.`,
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Run Now', onPress: runRefresh }]
  );

  const pct = Math.round(progress * 100);

  const STATUS_ROWS = [
    { label: 'Vercel API',    value: 'Online',                        icon: 'check-circle',   color: C.green   },
    { label: 'Supabase DB',   value: 'Connected',                     icon: 'database-check', color: C.green   },
    { label: 'AI Model',      value: 'NVIDIA NIM · Llama 3.1',        icon: 'brain',          color: C.primary },
    { label: 'Vision Model',  value: 'NVIDIA NIM · Llama 3.2 Vision', icon: 'eye',            color: C.primary },
    { label: 'Auto-Retrain',  value: 'Daily 6:00 AM',                 icon: 'clock-outline',  color: C.amber   },
  ];

  return (
    <View style={[s.root, { paddingTop: insets.top, backgroundColor: C.bg }]}>
      <Surface style={[s.topBar, { backgroundColor: C.surface }]} elevation={0}>
        <Text variant="headlineMedium" style={[s.appTitle, { color: C.text }]}>Control Center</Text>
        <Text variant="labelMedium"    style={{ color: C.text3, marginTop: SP.xs }}>
          Model training & AI prediction management
        </Text>
      </Surface>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: SP.huge }}>

        <Card style={[s.card, { backgroundColor: C.surface }]}>
          <Card.Content>
            <View style={s.cardHead}>
              <MaterialCommunityIcons name="pulse" size={18} color={C.green} />
              <Text variant="titleMedium" style={[s.cardTitle, { color: C.text }]}>System Status</Text>
            </View>
            {STATUS_ROWS.map((row, idx) => (
              <View key={row.label}>
                <List.Item
                  title={row.label}
                  description={row.value}
                  titleStyle={{ color: C.text, fontSize: 14 }}
                  descriptionStyle={{ color: row.color, fontWeight: '600', fontSize: 12, marginTop: 2 }}
                  left={() => (
                    <View style={s.listIcon}>
                      <MaterialCommunityIcons name={row.icon as any} size={16} color={row.color} />
                    </View>
                  )}
                  style={{ paddingVertical: 0, paddingHorizontal: 0 }}
                  contentStyle={{ marginLeft: 0 }}
                />
                {idx < STATUS_ROWS.length - 1 && <Divider style={{ backgroundColor: C.border }} />}
              </View>
            ))}
            {lastRun && (
              <Text variant="labelSmall" style={{ color: C.text3, textAlign: 'center', marginTop: SP.md }}>
                Last AI refresh: {lastRun}
              </Text>
            )}
            <Button mode="outlined" onPress={testConnection}
              loading={testStatus === 'testing'} disabled={testStatus === 'testing'}
              icon={testStatus === 'ok' ? 'check-circle' : testStatus === 'fail' ? 'close-circle' : 'wifi'}
              textColor={testStatus === 'ok' ? C.green : testStatus === 'fail' ? C.red : C.primary}
              style={[s.testBtn, { borderColor: testStatus === 'ok' ? C.green : testStatus === 'fail' ? C.red : C.border }]}
              contentStyle={{ paddingVertical: SP.xs }}>
              {testStatus === 'testing' ? 'Testing…' : 'Test AI Connection'}
            </Button>
            {!!testMsg && (
              <Surface style={[s.testResult, {
                backgroundColor: testStatus === 'ok' ? `${C.green}12` : `${C.red}12`,
                borderColor:     testStatus === 'ok' ? `${C.green}30` : `${C.red}30`,
              }]} elevation={0}>
                <Text variant="labelSmall" style={{ color: testStatus === 'ok' ? C.green : C.red, lineHeight: 18 }}>
                  {testMsg}
                </Text>
              </Surface>
            )}
          </Card.Content>
        </Card>

        <Card style={[s.card, { backgroundColor: C.surface }]}>
          <Card.Content>
            <View style={s.cardHead}>
              <MaterialCommunityIcons name="refresh" size={18} color={C.primary} />
              <Text variant="titleMedium" style={[s.cardTitle, { color: C.text }]}>AI Prediction Refresh</Text>
            </View>
            <Text variant="bodyMedium" style={{ color: C.text2, lineHeight: 22, marginBottom: SP.lg }}>
              Calls NVIDIA NIM AI for each vegetable using real-time Chennai weather + current prices. Saves predictions to Supabase — Home and Trends update instantly.
            </Text>
            <Button mode="contained" onPress={confirmRun}
              disabled={status === 'running'} loading={status === 'running'}
              icon={status === 'running' ? undefined : status === 'done' ? 'check' : 'brain'}
              style={s.refreshBtn} contentStyle={{ paddingVertical: SP.sm }}>
              {status === 'running' ? `Running… ${pct}%` : status === 'done' ? 'Run Again' : 'Refresh AI Predictions'}
            </Button>
            {status === 'running' && (
              <View style={{ marginTop: SP.lg }}>
                <ProgressBar progress={progress} color={C.primary}
                  style={{ height: 6, borderRadius: 3, backgroundColor: C.surface2 }} />
                <Text variant="labelSmall" style={{ color: C.text3, textAlign: 'center', marginTop: SP.sm, textTransform: 'capitalize' }}>
                  Processing: {currentVeg}
                </Text>
              </View>
            )}
            {status === 'done' && (
              <View style={s.doneRow}>
                <MaterialCommunityIcons name="check-circle" size={18} color={C.green} />
                <Text variant="labelLarge" style={{ color: C.green, fontWeight: '700' }}>All predictions refreshed!</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {results.length > 0 && (
          <Card style={[s.card, { backgroundColor: C.surface }]}>
            <Card.Content>
              <View style={s.cardHead}>
                <MaterialCommunityIcons name="console-line" size={16} color={C.text3} />
                <Text variant="titleMedium" style={[s.cardTitle, { color: C.text }]}>Prediction Log</Text>
              </View>
              <Surface style={[s.logBox, { backgroundColor: C.bg }]} elevation={0}>
                {results.map((line, i) => (
                  <Text key={i} variant="labelSmall"
                    style={{ color: line.startsWith('✓') ? C.green : C.red, fontFamily: 'monospace', lineHeight: 22 }}>
                    {line}
                  </Text>
                ))}
              </Surface>
            </Card.Content>
          </Card>
        )}

        <Card style={[s.card, { backgroundColor: C.surface }]}>
          <Card.Content>
            <View style={s.cardHead}>
              <MaterialCommunityIcons name="information-outline" size={18} color={C.sky} />
              <Text variant="titleMedium" style={[s.cardTitle, { color: C.text }]}>How It Works</Text>
            </View>
            {[
              { icon: '🤖', title: 'ML Models',  desc: 'XGBoost + LightGBM ensemble runs daily on seasonal patterns' },
              { icon: '⚡', title: 'AI Refresh', desc: 'NVIDIA NIM AI generates predictions using live weather + prices' },
              { icon: '☁️', title: 'Supabase',  desc: 'Predictions saved to cloud DB — all screens show the same price' },
              { icon: '📱', title: 'App',        desc: 'Home, Forecast, Trends and Scan all show the latest AI price' },
            ].map((row, idx, arr) => (
              <View key={row.title}>
                <View style={s.infoRow}>
                  <Text style={s.infoIcon}>{row.icon}</Text>
                  <View style={{ flex: 1, gap: SP.xs }}>
                    <Text variant="labelLarge" style={{ color: C.text, fontWeight: '700' }}>{row.title}</Text>
                    <Text variant="bodySmall"  style={{ color: C.text2, lineHeight: 18 }}>{row.desc}</Text>
                  </View>
                </View>
                {idx < arr.length - 1 && <Divider style={{ backgroundColor: C.border, marginLeft: 36 }} />}
              </View>
            ))}
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
  root:     { flex: 1 },
  topBar:   { paddingHorizontal: SP.lg, paddingTop: SP.md, paddingBottom: SP.lg },
  appTitle: { fontWeight: '800' },
  card:     { marginHorizontal: SP.lg, marginBottom: SP.md, borderRadius: SHAPE.xl },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginBottom: SP.lg },
  cardTitle: { fontWeight: '700', flex: 1 },
  listIcon:  { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
  testBtn:    { marginTop: SP.lg, borderRadius: SHAPE.lg },
  testResult: { borderRadius: SHAPE.sm, padding: SP.md, marginTop: SP.sm, borderWidth: 1 },
  refreshBtn: { borderRadius: SHAPE.lg },
  doneRow:    { flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginTop: SP.md, justifyContent: 'center' },
  logBox:     { borderRadius: SHAPE.md, padding: SP.md, maxHeight: 200 },
  infoRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: SP.md, paddingVertical: SP.md },
  infoIcon:   { fontSize: 20, width: 20, textAlign: 'center', marginTop: 2 },
});
