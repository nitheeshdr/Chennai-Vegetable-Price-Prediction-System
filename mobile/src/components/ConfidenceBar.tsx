import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props { confidence: number; }

export default function ConfidenceBar({ confidence }: Props) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.label, { color }]}>{pct}% confidence</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8, marginBottom: 4 },
  track: { height: 6, backgroundColor: '#374151', borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  label: { fontSize: 12, marginTop: 4, textAlign: 'center' },
});
