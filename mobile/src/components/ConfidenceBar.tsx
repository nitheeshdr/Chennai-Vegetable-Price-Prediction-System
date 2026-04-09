import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ProgressBar, Text } from 'react-native-paper';
import { C } from '../theme';

interface Props { confidence: number }

export default function ConfidenceBar({ confidence }: Props) {
  const pct   = Math.round(confidence * 100);
  const color = pct >= 80 ? C.green : pct >= 50 ? C.amber : C.red;
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text variant="labelMedium" style={{ color: C.text3 }}>Confidence</Text>
        <Text variant="labelLarge" style={{ color, fontWeight: '700' }}>{pct}%</Text>
      </View>
      <ProgressBar
        progress={confidence}
        color={color}
        style={styles.bar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 8 },
  row:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  bar:       { height: 8, borderRadius: 4, backgroundColor: C.surface3 },
});
