import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { C } from '../theme';

const { width: W, height: H } = Dimensions.get('window');
const BOX = W * 0.7;

type ScanState = 'idle' | 'scanning' | 'success' | 'error';

export default function ScanScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [errorMsg, setErrorMsg]   = useState('');
  const cameraRef = useRef<CameraView>(null);

  const processImage = async (imageUri: string) => {
    setScanState('scanning');
    setErrorMsg('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await api.scanImage(imageUri);
      setScanState('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        setScanState('idle');
        navigation.navigate('Result', { scanResult: result });
      }, 300);
    } catch (err: any) {
      setScanState('error');
      const msg = err?.response?.data?.error || err.message || 'Unknown error';
      setErrorMsg(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => setScanState('idle'), 3000);
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
    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri);
    }
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="camera-outline" size={64} color={C.text3} />
        <Text style={styles.permTitle}>Camera Access Needed</Text>
        <Text style={styles.permSub}>To scan vegetables and get instant price predictions</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.permBtnGrad}>
            <Ionicons name="camera" size={18} color="#fff" />
            <Text style={styles.permBtnText}>Allow Camera</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  const scanning = scanState === 'scanning';
  const hasError = scanState === 'error';

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {/* Dark vignette overlay */}
      <View style={styles.vignette} pointerEvents="none" />

      {/* Top label */}
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Scan Vegetable</Text>
        <Text style={styles.topSub}>Point at any vegetable for instant AI price prediction</Text>
      </View>

      {/* Scan box */}
      <View style={styles.scanArea} pointerEvents="none">
        {/* Corner brackets */}
        {[
          { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
          { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
          { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
          { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
        ].map((s, i) => (
          <View key={i} style={[styles.corner, s, {
            borderColor: hasError ? C.red : scanning ? C.amber : C.indigo,
          }]} />
        ))}

        {/* State overlay inside box */}
        {scanning && (
          <View style={styles.stateOverlay}>
            <ActivityIndicator size="large" color={C.amber} />
            <Text style={styles.stateText}>AI Identifying...</Text>
          </View>
        )}
        {hasError && (
          <View style={styles.stateOverlay}>
            <Ionicons name="close-circle" size={40} color={C.red} />
            <Text style={[styles.stateText, { color: C.red }]}>Scan Failed</Text>
          </View>
        )}
        {scanState === 'success' && (
          <View style={styles.stateOverlay}>
            <Ionicons name="checkmark-circle" size={40} color={C.green} />
            <Text style={[styles.stateText, { color: C.green }]}>Detected!</Text>
          </View>
        )}
      </View>

      {/* Error message */}
      {hasError && errorMsg ? (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={14} color={C.red} />
          <Text style={styles.errorText} numberOfLines={2}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* Bottom controls */}
      <LinearGradient
        colors={['transparent', '#000000cc']}
        style={styles.bottomGrad}
      >
        <View style={styles.controls}>
          {/* Gallery */}
          <TouchableOpacity style={styles.sideBtn} onPress={pickFromGallery} disabled={scanning}>
            <Ionicons name="images-outline" size={22} color={scanning ? C.text3 : C.text} />
            <Text style={[styles.sideBtnText, scanning && { color: C.text3 }]}>Gallery</Text>
          </TouchableOpacity>

          {/* Capture */}
          <TouchableOpacity
            style={[styles.captureBtn, scanning && styles.captureBtnDisabled]}
            onPress={takePicture}
            disabled={scanning}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={scanning ? [C.text3, C.text3] : ['#6366f1', '#4f46e5']}
              style={styles.captureBtnGrad}
            >
              {scanning
                ? <ActivityIndicator color="#fff" size="small" />
                : <Ionicons name="camera" size={28} color="#fff" />}
            </LinearGradient>
          </TouchableOpacity>

          {/* AI hint */}
          <View style={styles.sideBtn}>
            <Ionicons name="sparkles-outline" size={22} color={C.indigo} />
            <Text style={[styles.sideBtnText, { color: C.indigo }]}>AI Scan</Text>
          </View>
        </View>

        <Text style={styles.bottomHint}>
          Powered by Llama 3.2 Vision · Free model
        </Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32 },

  // Permission
  permTitle: { color: C.text, fontSize: 22, fontWeight: '800', marginTop: 16 },
  permSub: { color: C.text2, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  permBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  permBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 28 },
  permBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Overlay
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  // Top bar
  topBar: {
    position: 'absolute', top: 60, left: 0, right: 0,
    alignItems: 'center', paddingHorizontal: 32,
  },
  topTitle: { color: '#fff', fontSize: 20, fontWeight: '800', textShadowColor: '#000', textShadowRadius: 4 },
  topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 6, textAlign: 'center' },

  // Scan box
  scanArea: {
    position: 'absolute',
    top: H / 2 - BOX / 2,
    left: W / 2 - BOX / 2,
    width: BOX,
    height: BOX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 28, height: 28,
    borderColor: C.indigo,
    borderRadius: 4,
  },
  stateOverlay: { alignItems: 'center', gap: 8 },
  stateText: { color: '#fff', fontSize: 14, fontWeight: '700', textShadowColor: '#000', textShadowRadius: 4 },

  // Error
  errorBanner: {
    position: 'absolute',
    bottom: 180, left: 24, right: 24,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f43f5e20', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#f43f5e50',
  },
  errorText: { color: C.red, fontSize: 12, flex: 1 },

  // Bottom
  bottomGrad: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingTop: 40, paddingBottom: 40,
  },
  controls: {
    flexDirection: 'row', justifyContent: 'space-around',
    alignItems: 'center', paddingHorizontal: 24,
  },
  sideBtn: { alignItems: 'center', gap: 4, width: 70 },
  sideBtnText: { color: C.text, fontSize: 11, fontWeight: '600' },
  captureBtn: { borderRadius: 40 },
  captureBtnDisabled: { opacity: 0.5 },
  captureBtnGrad: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
  },
  bottomHint: {
    color: 'rgba(255,255,255,0.4)', fontSize: 11,
    textAlign: 'center', marginTop: 16,
  },
});
