import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '../services/api';
import { C } from '../theme';

const VEGETABLES = [
  'tomato','onion','potato','garlic','ginger','green_chilli',
  'brinjal','cabbage','carrot','cauliflower','beans','bitter_gourd',
  'bottle_gourd','coriander','drumstick','ladies_finger','raw_banana','tapioca',
];

type RefreshStatus = 'idle' | 'running' | 'done' | 'error';

export default function AdminScreen() {
  const [status, setStatus]       = useState<RefreshStatus>('idle');
  const [progress, setProgress]   = useState(0);
  const [currentVeg, setCurrentVeg] = useState('');
  const [results, setResults]     = useState<string[]>([]);
  const [lastRun, setLastRun]     = useState<string | null>(null);

  const runRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStatus('running');
    setProgress(0);
    setResults([]);
    setCurrentVeg('');

    const logs: string[] = [];
    let done = 0;

    for (const veg of VEGETABLES) {
      setCurrentVeg(veg.replace(/_/g, ' '));
      try {
        const pred = await api.aiPredict(veg);
        const label = `${veg.replace(/_/g,'  ')} → ₹${pred.predicted_price} (${pred.trend})`;
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
  };

  const confirmRun = () => {
    Alert.alert(
      'Refresh AI Predictions',
      `This will call OpenRouter GPT-4o Mini for all ${VEGETABLES.length} vegetables and save fresh predictions to Supabase. This takes ~2 minutes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Run Now', onPress: runRefresh, style: 'default' },
      ]
    );
  };

  const pct = Math.round(progress * 100);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#0a1628', C.bg]} style={styles.hero}>
        <Text style={styles.heroTitle}>Control Center</Text>
        <Text style={styles.heroSub}>Model training & AI prediction management</Text>
      </LinearGradient>

      {/* Status card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="pulse-outline" size={18} color={C.green} />
          <Text style={styles.cardTitle}>System Status</Text>
        </View>
        {[
          { label: 'Vercel API', val: 'Online', color: C.green, icon: 'checkmark-circle' },
          { label: 'Supabase DB', val: 'Connected', color: C.green, icon: 'checkmark-circle' },
          { label: 'AI Engine', val: 'OpenRouter GPT-4o Mini', color: C.indigoLight, icon: 'sparkles' },
          { label: 'Auto-Retrain', val: 'Daily 6:00 AM (Mac)', color: C.amber, icon: 'time-outline' },
        ].map(row => (
          <View key={row.label} style={styles.statusRow}>
            <Ionicons name={row.icon as any} size={14} color={row.color} />
            <Text style={styles.statusLabel}>{row.label}</Text>
            <Text style={[styles.statusVal, { color: row.color }]}>{row.val}</Text>
          </View>
        ))}
        {lastRun && (
          <Text style={styles.lastRun}>Last AI refresh: {lastRun}</Text>
        )}
      </View>

      {/* Train Button */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="sparkles-outline" size={18} color={C.indigo} />
          <Text style={styles.cardTitle}>AI Prediction Refresh</Text>
        </View>
        <Text style={styles.cardDesc}>
          Calls OpenRouter GPT-4o Mini for each vegetable using real-time Chennai weather + current prices. Saves fresh predictions to Supabase.
        </Text>

        <TouchableOpacity
          style={[styles.trainBtn, status === 'running' && styles.trainBtnDisabled]}
          onPress={confirmRun}
          disabled={status === 'running'}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={status === 'running' ? [C.card2, C.card2] : ['#6366f1', '#4f46e5']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.trainBtnGrad}
          >
            {status === 'running' ? (
              <>
                <Ionicons name="hourglass-outline" size={18} color={C.text2} />
                <Text style={[styles.trainBtnText, { color: C.text2 }]}>Running... {pct}%</Text>
              </>
            ) : (
              <>
                <Ionicons name="refresh-outline" size={18} color="#fff" />
                <Text style={styles.trainBtnText}>
                  {status === 'done' ? 'Run Again' : 'Refresh AI Predictions'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Progress bar */}
        {status === 'running' && (
          <View style={styles.progressWrap}>
            <View style={styles.progressBg}>
              <LinearGradient
                colors={['#6366f1', '#818cf8']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${pct}%` }]}
              />
            </View>
            <Text style={styles.progressVeg}>Processing: {currentVeg}</Text>
          </View>
        )}

        {status === 'done' && (
          <View style={styles.doneRow}>
            <Ionicons name="checkmark-circle" size={16} color={C.green} />
            <Text style={styles.doneText}>All predictions refreshed successfully!</Text>
          </View>
        )}
      </View>

      {/* Log */}
      {results.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="terminal-outline" size={16} color={C.text3} />
            <Text style={styles.cardTitle}>Prediction Log</Text>
          </View>
          <ScrollView style={styles.logBox} nestedScrollEnabled>
            {results.map((line, i) => (
              <Text key={i} style={[styles.logLine, { color: line.startsWith('✓') ? C.green : C.red }]}>
                {line}
              </Text>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Info */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="information-circle-outline" size={18} color={C.sky} />
          <Text style={styles.cardTitle}>How Training Works</Text>
        </View>
        {[
          ['🤖 ML Models', 'XGBoost + LightGBM + LinearRegression ensemble runs on your Mac at 6 AM daily'],
          ['⚡ AI Refresh', 'OpenRouter GPT-4o Mini generates predictions using live weather + prices anytime'],
          ['☁️ Supabase', 'Predictions stored in cloud DB — app reads the latest entry for each vegetable'],
          ['📱 App', 'Shows ML predictions (from Mac) or AI predictions (from this screen)'],
        ].map(([title, desc]) => (
          <View key={title} style={styles.infoRow}>
            <Text style={styles.infoTitle}>{title}</Text>
            <Text style={styles.infoDesc}>{desc}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  hero: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: C.text },
  heroSub: { color: C.text3, fontSize: 13, marginTop: 4 },
  card: {
    marginHorizontal: 16, marginBottom: 14, backgroundColor: C.card,
    borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { color: C.text, fontSize: 15, fontWeight: '700' },
  cardDesc: { color: C.text2, fontSize: 13, lineHeight: 20, marginBottom: 16 },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  statusLabel: { color: C.text2, fontSize: 13, flex: 1 },
  statusVal: { fontSize: 12, fontWeight: '600' },
  lastRun: { color: C.text3, fontSize: 11, marginTop: 10, textAlign: 'center' },
  trainBtn: { borderRadius: 14, overflow: 'hidden' },
  trainBtnDisabled: { opacity: 0.7 },
  trainBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
  },
  trainBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  progressWrap: { marginTop: 14 },
  progressBg: {
    height: 6, backgroundColor: C.card2, borderRadius: 3, overflow: 'hidden', marginBottom: 6,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressVeg: { color: C.text3, fontSize: 12, textAlign: 'center', textTransform: 'capitalize' },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, justifyContent: 'center' },
  doneText: { color: C.green, fontSize: 13, fontWeight: '600' },
  logBox: { maxHeight: 200, backgroundColor: C.bg, borderRadius: 10, padding: 10 },
  logLine: { fontSize: 12, fontFamily: 'monospace', lineHeight: 20 },
  infoRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  infoTitle: { color: C.text, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  infoDesc: { color: C.text2, fontSize: 12, lineHeight: 18 },
});
