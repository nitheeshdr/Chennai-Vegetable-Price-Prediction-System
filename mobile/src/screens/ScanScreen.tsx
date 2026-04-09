import React, { useState, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Surface, Text, FAB, IconButton, ActivityIndicator, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';
import { C, SP, SHAPE } from '../theme';

const { width: W, height: H } = Dimensions.get('window');
const BOX = W * 0.68;

type ScanState = 'idle' | 'scanning' | 'success' | 'error';

export default function ScanScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState,  setScanState]  = useState<ScanState>('idle');
  const [errorMsg,   setErrorMsg]   = useState('');
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
      setTimeout(() => { setScanState('idle'); navigation.navigate('Result', { scanResult: result }); }, 400);
    } catch (err: any) {
      setScanState('error');
      setErrorMsg(err?.response?.data?.error || err.message || 'Could not identify vegetable');
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
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6 });
    if (!res.canceled && res.assets[0]) await processImage(res.assets[0].uri);
  };

  // ── Permission gate ────────────────────────────────────────────────────────
  if (!permission) return <View style={s.container} />;

  if (!permission.granted) {
    return (
      <View style={[s.container, s.permCenter, { paddingTop: insets.top }]}>
        <Surface style={s.permCard} elevation={3}>
          <View style={[s.permIcon, { backgroundColor: `${C.primary}18` }]}>
            <MaterialCommunityIcons name="camera-off" size={48} color={C.primary} />
          </View>
          <Text variant="headlineSmall" style={s.permTitle}>Camera Access Needed</Text>
          <Text variant="bodyMedium" style={s.permSub}>
            Point your camera at any vegetable for instant AI price prediction
          </Text>
          <Button
            mode="contained"
            onPress={requestPermission}
            icon="camera"
            style={s.permBtn}
            contentStyle={{ paddingVertical: SP.sm }}
          >
            Allow Camera
          </Button>
        </Surface>
      </View>
    );
  }

  const scanning  = scanState === 'scanning';
  const hasError  = scanState === 'error';
  const isOk      = scanState === 'success';
  const frameColor = hasError ? C.red : isOk ? C.green : scanning ? C.amber : C.primary;

  return (
    <View style={s.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {/* Vignette */}
      <View style={s.vignette} pointerEvents="none" />

      {/* Top label */}
      <View style={[s.topLabel, { paddingTop: insets.top + SP.lg }]}>
        <Text variant="headlineSmall" style={s.topTitle}>Scan Vegetable</Text>
        <Text variant="bodySmall" style={s.topSub}>
          Point at any vegetable for instant AI price prediction
        </Text>
      </View>

      {/* Scan frame */}
      <View style={s.scanArea} pointerEvents="none">
        {[
          { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
          { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
          { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
          { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
        ].map((style, i) => (
          <View key={i} style={[s.corner, style, { borderColor: frameColor }]} />
        ))}

        {scanning && (
          <View style={s.stateOverlay}>
            <ActivityIndicator size="large" color={C.amber} />
            <Text variant="labelLarge" style={[s.stateText, { color: C.amber }]}>AI Identifying…</Text>
          </View>
        )}
        {hasError && (
          <View style={s.stateOverlay}>
            <MaterialCommunityIcons name="close-circle" size={48} color={C.red} />
            <Text variant="labelLarge" style={[s.stateText, { color: C.red }]}>Scan Failed</Text>
          </View>
        )}
        {isOk && (
          <View style={s.stateOverlay}>
            <MaterialCommunityIcons name="check-circle" size={48} color={C.green} />
            <Text variant="labelLarge" style={[s.stateText, { color: C.green }]}>Detected!</Text>
          </View>
        )}
      </View>

      {/* Error banner */}
      {hasError && !!errorMsg && (
        <Surface style={s.errorBanner} elevation={3}>
          <MaterialCommunityIcons name="alert" size={16} color={C.red} />
          <Text variant="bodySmall" style={{ color: C.red, flex: 1 }} numberOfLines={2}>
            {errorMsg}
          </Text>
        </Surface>
      )}

      {/* Bottom controls */}
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + SP.xxl }]}>
        <View style={s.sideSlot}>
          <IconButton
            icon="image-multiple-outline"
            iconColor={scanning ? C.text3 : C.text}
            size={26}
            containerColor={scanning ? 'transparent' : 'rgba(255,255,255,0.12)'}
            style={{ margin: 0 }}
            onPress={pickFromGallery}
            disabled={scanning}
          />
          <Text variant="labelSmall" style={{ color: scanning ? C.text3 : 'rgba(255,255,255,0.7)', marginTop: SP.xs }}>
            Gallery
          </Text>
        </View>

        <FAB
          icon={scanning ? '' : 'camera'}
          loading={scanning}
          disabled={scanning}
          onPress={takePicture}
          size="large"
          style={[s.captureFab, { backgroundColor: scanning ? C.surface3 : C.primary }]}
          color="#fff"
        />

        <View style={s.sideSlot}>
          <IconButton
            icon="brain"
            iconColor={C.primary}
            size={26}
            containerColor={`${C.primary}20`}
            style={{ margin: 0 }}
          />
          <Text variant="labelSmall" style={{ color: C.primary, marginTop: SP.xs }}>AI Scan</Text>
        </View>
      </View>

      <Text variant="labelSmall" style={[s.hint, { bottom: insets.bottom + SP.sm }]}>
        Powered by Llama 3.2 Vision · Free model
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#000' },
  permCenter: { justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg, padding: SP.lg },
  permCard:   { borderRadius: SHAPE.xl, padding: SP.xxl, backgroundColor: C.surface, width: '100%', gap: SP.lg, alignItems: 'center' },
  permIcon:   { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center' },
  permTitle:  { color: C.text, fontWeight: '800', textAlign: 'center' },
  permSub:    { color: C.text2, textAlign: 'center', lineHeight: 22 },
  permBtn:    { borderRadius: SHAPE.lg, width: '100%' },

  vignette: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },

  topLabel: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingHorizontal: SP.xxxl },
  topTitle: { color: '#fff', fontWeight: '800', textShadowColor: '#000', textShadowRadius: 8 },
  topSub:   { color: 'rgba(255,255,255,0.6)', marginTop: SP.xs, textAlign: 'center' },

  scanArea: {
    position: 'absolute',
    top:  H / 2 - BOX / 2,
    left: W / 2 - BOX / 2,
    width: BOX, height: BOX,
    justifyContent: 'center', alignItems: 'center',
  },
  corner:       { position: 'absolute', width: 30, height: 30, borderRadius: SP.xs },
  stateOverlay: { alignItems: 'center', gap: SP.sm },
  stateText:    { fontWeight: '800', textShadowColor: '#000', textShadowRadius: 6 },

  errorBanner: {
    position: 'absolute', bottom: 185, left: SP.xxl, right: SP.xxl,
    flexDirection: 'row', alignItems: 'center', gap: SP.md,
    backgroundColor: `${C.red}20`, borderRadius: SHAPE.md, padding: SP.lg,
    borderWidth: 1, borderColor: `${C.red}40`,
  },

  bottomBar:  {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    paddingHorizontal: SP.xxl, paddingTop: SP.xxl,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sideSlot:   { alignItems: 'center', width: 72 },
  captureFab: { width: 72, height: 72, borderRadius: 36 },

  hint: { position: 'absolute', left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.3)' },
});
