import React, { useState, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {
  Surface, Text, FAB, IconButton, ActivityIndicator,
  Button,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';
import { C } from '../theme';

const { width: W, height: H } = Dimensions.get('window');
const BOX = W * 0.68;

type ScanState = 'idle' | 'scanning' | 'success' | 'error';

export default function ScanScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [errorMsg, setErrorMsg]   = useState('');
  const cameraRef = useRef<CameraView>(null);
  const insets    = useSafeAreaInsets();

  const processImage = async (uri: string) => {
    setScanState('scanning');
    setErrorMsg('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await api.scanImage(uri);
      setScanState('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        setScanState('idle');
        navigation.navigate('Result', { scanResult: result });
      }, 400);
    } catch (err: any) {
      setScanState('error');
      setErrorMsg(err?.response?.data?.error || err.message || 'Unknown error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => setScanState('idle'), 3500);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || scanState === 'scanning') return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
    if (photo?.uri) await processImage(photo.uri);
  };

  const pickFromGallery = async () => {
    if (scanState === 'scanning') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) await processImage(result.assets[0].uri);
  };

  // Permission screen
  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.permCenter]}>
        <Surface style={styles.permCard} elevation={3}>
          <MaterialCommunityIcons name="camera-off" size={64} color={C.text3} style={{ alignSelf: 'center', marginBottom: 16 }} />
          <Text variant="headlineSmall" style={styles.permTitle}>Camera Access Needed</Text>
          <Text variant="bodyMedium" style={styles.permSub}>
            Point your camera at any vegetable for instant AI price prediction
          </Text>
          <Button
            mode="contained"
            onPress={requestPermission}
            icon="camera"
            style={styles.permBtn}
            contentStyle={{ paddingVertical: 6 }}
          >
            Allow Camera
          </Button>
        </Surface>
      </View>
    );
  }

  const scanning = scanState === 'scanning';
  const hasError = scanState === 'error';
  const isOk     = scanState === 'success';

  const bracketColor = hasError ? C.red : isOk ? C.green : scanning ? C.amber : C.primary;

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {/* Vignette */}
      <View style={styles.vignette} pointerEvents="none" />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Text variant="headlineSmall" style={styles.topTitle}>Scan Vegetable</Text>
        <Text variant="bodySmall" style={styles.topSub}>
          Point camera at any vegetable for instant AI price
        </Text>
      </View>

      {/* Scan frame */}
      <View style={styles.scanArea} pointerEvents="none">
        {/* Corner brackets */}
        {[
          { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
          { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
          { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
          { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
        ].map((s, i) => (
          <View key={i} style={[styles.corner, s, { borderColor: bracketColor }]} />
        ))}

        {/* State overlay */}
        {scanning && (
          <View style={styles.stateOverlay}>
            <ActivityIndicator size="large" color={C.amber} />
            <Text variant="labelLarge" style={[styles.stateText, { color: C.amber }]}>AI Identifying…</Text>
          </View>
        )}
        {hasError && (
          <View style={styles.stateOverlay}>
            <MaterialCommunityIcons name="close-circle" size={48} color={C.red} />
            <Text variant="labelLarge" style={[styles.stateText, { color: C.red }]}>Scan Failed</Text>
          </View>
        )}
        {isOk && (
          <View style={styles.stateOverlay}>
            <MaterialCommunityIcons name="check-circle" size={48} color={C.green} />
            <Text variant="labelLarge" style={[styles.stateText, { color: C.green }]}>Detected!</Text>
          </View>
        )}
      </View>

      {/* Error banner */}
      {hasError && errorMsg ? (
        <Surface style={styles.errorBanner} elevation={3}>
          <MaterialCommunityIcons name="alert" size={16} color={C.red} />
          <Text variant="bodySmall" style={{ color: C.red, flex: 1 }} numberOfLines={2}>
            {errorMsg}
          </Text>
        </Surface>
      ) : null}

      {/* Bottom controls */}
      <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 24 }]}>
        {/* Gallery */}
        <View style={styles.sideAction}>
          <IconButton
            icon="image-multiple"
            iconColor={scanning ? C.text3 : C.text}
            size={28}
            style={styles.sideIconBtn}
            onPress={pickFromGallery}
            disabled={scanning}
          />
          <Text variant="labelSmall" style={{ color: scanning ? C.text3 : C.text2, marginTop: 4 }}>Gallery</Text>
        </View>

        {/* Main capture FAB */}
        <FAB
          icon={scanning ? '' : 'camera'}
          onPress={takePicture}
          disabled={scanning}
          loading={scanning}
          size="large"
          style={[styles.captureFab, { backgroundColor: scanning ? C.surface3 : C.primary }]}
          color="#fff"
        />

        {/* AI badge */}
        <View style={styles.sideAction}>
          <IconButton
            icon="brain"
            iconColor={C.primary}
            size={28}
            style={[styles.sideIconBtn, { backgroundColor: `${C.primary}18` }]}
          />
          <Text variant="labelSmall" style={{ color: C.primary, marginTop: 4 }}>AI Scan</Text>
        </View>
      </View>

      {/* Hint */}
      <Text variant="labelSmall" style={[styles.hint, { bottom: insets.bottom + 4 }]}>
        Powered by Llama 3.2 Vision · Free model
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#000' },
  permCenter:  { justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg, padding: 24 },
  permCard:    { borderRadius: 28, padding: 28, backgroundColor: C.surface, width: '100%' },
  permTitle:   { color: C.text, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  permSub:     { color: C.text2, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  permBtn:     { borderRadius: 14 },

  vignette: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },

  topBar:  { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 32 },
  topTitle: { color: '#fff', fontWeight: '800', textShadowColor: '#000', textShadowRadius: 8 },
  topSub:   { color: 'rgba(255,255,255,0.65)', marginTop: 4, textAlign: 'center' },

  scanArea: {
    position: 'absolute',
    top:    H / 2 - BOX / 2,
    left:   W / 2 - BOX / 2,
    width:  BOX,
    height: BOX,
    justifyContent: 'center',
    alignItems:     'center',
  },
  corner: {
    position: 'absolute',
    width: 30, height: 30,
    borderRadius: 4,
  },
  stateOverlay: { alignItems: 'center', gap: 8 },
  stateText:    { fontWeight: '800', textShadowColor: '#000', textShadowRadius: 6 },

  errorBanner: {
    position: 'absolute',
    bottom: 180, left: 24, right: 24,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: `${C.red}20`, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: `${C.red}40`,
  },

  bottomControls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-around',
    alignItems: 'center', paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingTop: 20,
  },
  sideAction:  { alignItems: 'center', width: 72 },
  sideIconBtn: { margin: 0 },
  captureFab:  { width: 72, height: 72, borderRadius: 36 },

  hint: {
    position: 'absolute', left: 0, right: 0,
    textAlign: 'center', color: 'rgba(255,255,255,0.35)',
  },
});
