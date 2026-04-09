import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Surface, Text, Card, Button, List, ProgressBar,
  Snackbar, Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, apiClient } from '../services/api';
import { C, SP, SHAPE } from '../theme';

const VEGETABLES = [
  'tomato','onion','potato','garlic','ginger','green_chilli',
  'brinjal','cabbage','carrot','cauliflower','beans','bitter_gourd',
  'bottle_gourd','coriander','drumstick','ladies_finger','raw_banana','tapioca',
];

type RefreshStatus = 'idle' | 'running' | 'done' | 'error';
type TestStatus    = 'idle' | 'testing' | 'ok' | 'fail';

export default function AdminScreen() {
  const insets = useSafeAreaInsets();

  const [status,     setStatus]     = useState<RefreshStatus>('idle');
  const [progress,   setProgress]   = useState(0);
  const [currentVeg, setCurrentVeg] = useState('');
  const [results,    setResults]    = useState<string[]>([]);
  const [lastRun,    setLastRun]    = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMsg,    setTestMsg]    = useState('');
  const [snack,      setSnack]      = useState('');

  const testConnection = async () => {
    setTestStatus('testing');
    setTestMsg('');
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
      const msg = err?.response?.data?.error || err.message || 'Connection failed';
      setTestStatus('fail');
      setTestMsg(`✗ ${msg}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const runRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setStatus('running');
    setProgress(0);
    setResults([]);
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
    setStatus('done');
    setCurrentVeg('');
    setLastRun(new Date().toLocaleString('en-IN'));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSnack('All AI predictions refreshed!');
  };

  const confirmRun = () => Alert.alert(
    'Refresh AI Predictions',
    `Calls free AI model for all ${VEGETABLES.length} vegetables. Takes ~2 minutes.`,
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Run Now', onPress: runRefresh }]
  );

  const pct = Math.round(progress * 100);

  const STATUS_ROWS = [
    { label: 'Vercel API',    value: 'Online',                  icon: 'check-circle',   color: C.green   },
    { label: 'Supabase DB',   value: 'Connected',               icon: 'database-check', color: C.green   },
    { label: 'AI Model',      value: 'NVIDIA NIM · Llama 3.1',         icon: 'brain', color: C.primary },
    { label: 'Vision Model',  value: 'NVIDIA NIM · Llama 3.2 Vision', icon: 'eye',   color: C.primary },
    { label: 'Auto-Retrain',  value: 'Daily 6:00 AM',           icon: 'clock-outline',  color: C.amber   },
  ];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* ── Top App Bar ── */}
      <Surface style={s.topBar} elevation={0}>
        <Text variant="headlineMedium" style={s.appTitle}>Control Center</Text>
        <Text variant="labelMedium" style={{ color: C.text3, marginTop: SP.xs }}>
          Model training & AI prediction management
        </Text>
      </Surface>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: SP.huge }}>

        {/* ── System Status ── */}
        <Card style={s.card}>
          <Card.Content>
            <View style={s.cardHead}>
              <MaterialCommunityIcons name="pulse" size={18} color={C.green} />
              <Text variant="titleMedium" style={s.cardTitle}>System Status</Text>
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

            {/* Test Connection */}
            <Button
              mode="outlined"
              onPress={testConnection}
              loading={testStatus === 'testing'}
              disabled={testStatus === 'testing'}
              icon={testStatus === 'ok' ? 'check-circle' : testStatus === 'fail' ? 'close-circle' : 'wifi'}
              textColor={testStatus === 'ok' ? C.green : testStatus === 'fail' ? C.red : C.primary}
              style={[
                s.testBtn,
                { borderColor: testStatus === 'ok' ? C.green : testStatus === 'fail' ? C.red : C.border },
              ]}
              contentStyle={{ paddingVertical: SP.xs }}
            >
              {testStatus === 'testing' ? 'Testing…' : 'Test AI Connection'}
            </Button>

            {!!testMsg && (
              <Surface style={[
                s.testResult,
                { backgroundColor: testStatus === 'ok' ? `${C.green}12` : `${C.red}12`,
                  borderColor:      testStatus === 'ok' ? `${C.green}30` : `${C.red}30` },
              ]} elevation={0}>
                <Text variant="labelSmall" style={{ color: testStatus === 'ok' ? C.green : C.red, lineHeight: 18 }}>
                  {testMsg}
                </Text>
              </Surface>
            )}
          </Card.Content>
        </Card>

        {/* ── AI Refresh ── */}
        <Card style={s.card}>
          <Card.Content>
            <View style={s.cardHead}>
              <MaterialCommunityIcons name="refresh" size={18} color={C.primary} />
              <Text variant="titleMedium" style={s.cardTitle}>AI Prediction Refresh</Text>
            </View>
            <Text variant="bodyMedium" style={{ color: C.text2, lineHeight: 22, marginBottom: SP.lg }}>
              Calls a free AI model for each vegetable using real-time Chennai weather + current prices. Saves fresh predictions to Supabase.
            </Text>

            <Button
              mode="contained"
              onPress={confirmRun}
              disabled={status === 'running'}
              loading={status === 'running'}
              icon={status === 'running' ? undefined : status === 'done' ? 'check' : 'brain'}
              style={s.refreshBtn}
              contentStyle={{ paddingVertical: SP.sm }}
            >
              {status === 'running' ? `Running… ${pct}%` : status === 'done' ? 'Run Again' : 'Refresh AI Predictions'}
            </Button>

            {status === 'running' && (
              <View style={{ marginTop: SP.lg }}>
                <ProgressBar
                  progress={progress}
                  color={C.primary}
                  style={{ height: 6, borderRadius: 3, backgroundColor: C.surface2 }}
                />
                <Text variant="labelSmall" style={{ color: C.text3, textAlign: 'center', marginTop: SP.sm, textTransform: 'capitalize' }}>
                  Processing: {currentVeg}
                </Text>
              </View>
            )}

            {status === 'done' && (
              <View style={s.doneRow}>
                <MaterialCommunityIcons name="check-circle" size={18} color={C.green} />
                <Text variant="labelLarge" style={{ color: C.green, fontWeight: '700' }}>
                  All predictions refreshed!
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* ── Log ── */}
        {results.length > 0 && (
          <Card style={s.card}>
            <Card.Content>
              <View style={s.cardHead}>
                <MaterialCommunityIcons name="console-line" size={16} color={C.text3} />
                <Text variant="titleMedium" style={s.cardTitle}>Prediction Log</Text>
              </View>
              <Surface style={s.logBox} elevation={0}>
                {results.map((line, i) => (
                  <Text
                    key={i}
                    variant="labelSmall"
                    style={{ color: line.startsWith('✓') ? C.green : C.red, fontFamily: 'monospace', lineHeight: 22 }}
                  >
                    {line}
                  </Text>
                ))}
              </Surface>
            </Card.Content>
          </Card>
        )}

        {/* ── How it works ── */}
        <Card style={s.card}>
          <Card.Content>
            <View style={s.cardHead}>
              <MaterialCommunityIcons name="information-outline" size={18} color={C.sky} />
              <Text variant="titleMedium" style={s.cardTitle}>How It Works</Text>
            </View>
            {[
              { icon: '🤖', title: 'ML Models',  desc: 'XGBoost + LightGBM ensemble runs on your Mac at 6 AM daily' },
              { icon: '⚡', title: 'AI Refresh', desc: 'Free AI model generates predictions using live weather + prices anytime' },
              { icon: '☁️', title: 'Supabase',  desc: 'Predictions stored in cloud DB — app reads the latest for each vegetable' },
              { icon: '📱', title: 'App',        desc: 'Shows ML predictions (from Mac) or AI predictions (from this screen)' },
            ].map((row, idx, arr) => (
              <View key={row.title}>
                <View style={s.infoRow}>
                  <Text style={s.infoIcon}>{row.icon}</Text>
                  <View style={{ flex: 1, gap: SP.xs }}>
                    <Text variant="labelLarge" style={{ color: C.text, fontWeight: '700' }}>{row.title}</Text>
                    <Text variant="bodySmall" style={{ color: C.text2, lineHeight: 18 }}>{row.desc}</Text>
                  </View>
                </View>
                {idx < arr.length - 1 && <Divider style={{ backgroundColor: C.border, marginLeft: 36 }} />}
              </View>
            ))}
          </Card.Content>
        </Card>
      </ScrollView>

      <Snackbar
        visible={!!snack}
        onDismiss={() => setSnack('')}
        duration={3000}
        style={{ backgroundColor: C.surface2, marginBottom: SP.sm }}
      >
        {snack}
      </Snackbar>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  topBar: { backgroundColor: C.surface, paddingHorizontal: SP.lg, paddingTop: SP.md, paddingBottom: SP.lg },
  appTitle: { color: C.text, fontWeight: '800' },

  card:     { marginHorizontal: SP.lg, marginBottom: SP.md, backgroundColor: C.surface, borderRadius: SHAPE.xl },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginBottom: SP.lg },
  cardTitle: { color: C.text, fontWeight: '700' },

  listIcon:  { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },

  testBtn:    { marginTop: SP.lg, borderRadius: SHAPE.lg },
  testResult: { borderRadius: SHAPE.sm, padding: SP.md, marginTop: SP.sm, borderWidth: 1 },

  refreshBtn: { borderRadius: SHAPE.lg },
  doneRow:    { flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginTop: SP.md, justifyContent: 'center' },

  logBox:  { backgroundColor: C.bg, borderRadius: SHAPE.md, padding: SP.md, maxHeight: 200 },

  infoRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: SP.md, paddingVertical: SP.md },
  infoIcon: { fontSize: 20, width: 20, textAlign: 'center', marginTop: 2 },
});
