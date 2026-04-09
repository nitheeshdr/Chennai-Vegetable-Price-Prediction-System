import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Surface, Text, Card, Button, List, ProgressBar,
  Snackbar, Divider, Chip, ActivityIndicator,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, apiClient } from '../services/api';
import { C } from '../theme';

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
        setTestMsg(`✗ ${data.error || 'Unknown error'} — ${data.hint || ''}`);
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
    setCurrentVeg('');

    const logs: string[] = [];
    let done = 0;

    for (const veg of VEGETABLES) {
      setCurrentVeg(veg.replace(/_/g, ' '));
      try {
        const pred  = await api.aiPredict(veg);
        const label = `${veg.replace(/_/g, ' ')} → ₹${pred.predicted_price.toFixed(0)} (${pred.trend})`;
        logs.push(`✓ ${label}`);
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

  const confirmRun = () => {
    Alert.alert(
      'Refresh AI Predictions',
      `Calls free AI model for all ${VEGETABLES.length} vegetables. Takes ~2 minutes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Run Now', onPress: runRefresh },
      ]
    );
  };

  const pct = Math.round(progress * 100);

  const STATUS_ROWS = [
    { label: 'Vercel API',   value: 'Online',                   icon: 'check-circle',     color: C.green   },
    { label: 'Supabase DB',  value: 'Connected',                icon: 'database-check',   color: C.green   },
    { label: 'AI Model',     value: 'Mistral 7B (Free)',        icon: 'brain',            color: C.primary },
    { label: 'Vision Model', value: 'Llama 3.2 Vision (Free)',  icon: 'eye',              color: C.primary },
    { label: 'Auto-Retrain', value: 'Daily 6:00 AM (Mac)',      icon: 'clock-outline',    color: C.amber   },
  ];

  const INFO_ROWS = [
    { icon: '🤖', title: 'ML Models',   desc: 'XGBoost + LightGBM + LinearRegression ensemble runs on your Mac at 6 AM daily' },
    { icon: '⚡', title: 'AI Refresh',  desc: 'Free OpenRouter model generates predictions using live weather + current prices' },
    { icon: '☁️', title: 'Supabase',   desc: 'Predictions stored in cloud DB — app reads the latest entry for each vegetable' },
    { icon: '📱', title: 'App',         desc: 'Shows ML predictions (from Mac) or AI predictions (from this screen)' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top App Bar */}
      <Surface style={styles.appbar} elevation={0}>
        <Text variant="headlineMedium" style={styles.appTitle}>Control Center</Text>
        <Text variant="labelMedium" style={{ color: C.text3 }}>Model training & AI prediction management</Text>
      </Surface>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* System Status */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="pulse" size={18} color={C.green} />
              <Text variant="titleMedium" style={styles.cardTitle}>System Status</Text>
            </View>
            {STATUS_ROWS.map((row, idx) => (
              <View key={row.label}>
                <List.Item
                  title={row.label}
                  description={row.value}
                  titleStyle={{ color: C.text, fontSize: 14 }}
                  descriptionStyle={{ color: row.color, fontWeight: '600', fontSize: 12 }}
                  left={() => (
                    <View style={styles.listIcon}>
                      <MaterialCommunityIcons name={row.icon as any} size={16} color={row.color} />
                    </View>
                  )}
                  style={{ paddingVertical: 2, paddingHorizontal: 0 }}
                />
                {idx < STATUS_ROWS.length - 1 && <Divider style={{ backgroundColor: C.border }} />}
              </View>
            ))}

            {lastRun && (
              <Text variant="labelSmall" style={styles.lastRun}>Last AI refresh: {lastRun}</Text>
            )}

            {/* Test Connection */}
            <Button
              mode="outlined"
              onPress={testConnection}
              loading={testStatus === 'testing'}
              disabled={testStatus === 'testing'}
              icon={
                testStatus === 'ok'      ? 'check-circle' :
                testStatus === 'fail'    ? 'close-circle' :
                'wifi'
              }
              textColor={
                testStatus === 'ok'   ? C.green :
                testStatus === 'fail' ? C.red   :
                C.primary
              }
              style={[
                styles.testBtn,
                { borderColor: testStatus === 'ok' ? C.green : testStatus === 'fail' ? C.red : C.primary },
              ]}
              contentStyle={{ paddingVertical: 4 }}
            >
              {testStatus === 'testing' ? 'Testing…' : 'Test AI Connection'}
            </Button>
            {testMsg ? (
              <Surface style={[
                styles.testResult,
                { backgroundColor: testStatus === 'ok' ? `${C.green}15` : `${C.red}15`, borderColor: testStatus === 'ok' ? `${C.green}30` : `${C.red}30` },
              ]} elevation={0}>
                <Text variant="labelSmall" style={{ color: testStatus === 'ok' ? C.green : C.red, lineHeight: 18 }}>
                  {testMsg}
                </Text>
              </Surface>
            ) : null}
          </Card.Content>
        </Card>

        {/* AI Prediction Refresh */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="refresh" size={18} color={C.primary} />
              <Text variant="titleMedium" style={styles.cardTitle}>AI Prediction Refresh</Text>
            </View>
            <Text variant="bodyMedium" style={styles.cardDesc}>
              Calls free AI model for each vegetable using real-time Chennai weather + current prices. Saves fresh predictions to Supabase.
            </Text>

            <Button
              mode="contained"
              onPress={confirmRun}
              disabled={status === 'running'}
              loading={status === 'running'}
              icon={status === 'running' ? undefined : status === 'done' ? 'check' : 'brain'}
              style={styles.refreshBtn}
              contentStyle={{ paddingVertical: 8 }}
            >
              {status === 'running'
                ? `Running… ${pct}%`
                : status === 'done' ? 'Run Again' : 'Refresh AI Predictions'}
            </Button>

            {status === 'running' && (
              <View style={styles.progressWrap}>
                <ProgressBar
                  progress={progress}
                  color={C.primary}
                  style={styles.progressBar}
                />
                <Text variant="labelSmall" style={styles.progressVeg}>
                  Processing: {currentVeg}
                </Text>
              </View>
            )}

            {status === 'done' && (
              <View style={styles.doneRow}>
                <MaterialCommunityIcons name="check-circle" size={16} color={C.green} />
                <Text variant="labelLarge" style={{ color: C.green, fontWeight: '700' }}>
                  All predictions refreshed!
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Log */}
        {results.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="console-line" size={16} color={C.text3} />
                <Text variant="titleMedium" style={styles.cardTitle}>Prediction Log</Text>
              </View>
              <Surface style={styles.logBox} elevation={0}>
                {results.map((line, i) => (
                  <Text
                    key={i}
                    variant="labelSmall"
                    style={[styles.logLine, { color: line.startsWith('✓') ? C.green : C.red }]}
                  >
                    {line}
                  </Text>
                ))}
              </Surface>
            </Card.Content>
          </Card>
        )}

        {/* How it works */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="information-outline" size={18} color={C.sky} />
              <Text variant="titleMedium" style={styles.cardTitle}>How Training Works</Text>
            </View>
            {INFO_ROWS.map((row, idx) => (
              <View key={row.title}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>{row.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text variant="labelLarge" style={{ color: C.text, fontWeight: '700' }}>{row.title}</Text>
                    <Text variant="bodySmall" style={{ color: C.text2, lineHeight: 18, marginTop: 2 }}>{row.desc}</Text>
                  </View>
                </View>
                {idx < INFO_ROWS.length - 1 && <Divider style={{ backgroundColor: C.border, marginLeft: 36 }} />}
              </View>
            ))}
          </Card.Content>
        </Card>

        <View style={{ height: 40 }} />
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
  cardTitle:  { color: C.text, fontWeight: '700' },
  cardDesc:   { color: C.text2, lineHeight: 20, marginBottom: 16 },

  listIcon: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  lastRun:  { color: C.text3, textAlign: 'center', marginTop: 12, marginBottom: 4 },

  testBtn:    { marginTop: 12, borderRadius: 12 },
  testResult: { borderRadius: 10, padding: 10, marginTop: 8, borderWidth: 1 },

  refreshBtn:   { borderRadius: 14 },
  progressWrap: { marginTop: 14 },
  progressBar:  { height: 6, borderRadius: 3, backgroundColor: C.surface3, marginBottom: 6 },
  progressVeg:  { color: C.text3, textAlign: 'center', textTransform: 'capitalize' },
  doneRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, justifyContent: 'center' },

  logBox: { backgroundColor: C.bg, borderRadius: 12, padding: 12, maxHeight: 200 },
  logLine: { fontFamily: 'monospace', lineHeight: 22 },

  infoRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12 },
  infoIcon: { fontSize: 20, width: 26, textAlign: 'center' },
});
