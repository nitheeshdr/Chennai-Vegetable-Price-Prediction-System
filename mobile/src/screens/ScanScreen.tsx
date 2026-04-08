import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { api } from '../services/api';

export default function ScanScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const processImage = async (imageUri: string) => {
    setIsScanning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await api.scanImage(imageUri);
      navigation.navigate('Result', { scanResult: result });
    } catch (err: any) {
      Alert.alert('Scan Failed', err.message || 'Could not identify vegetable. Try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || isScanning) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
    if (photo?.uri) await processImage(photo.uri);
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri);
    }
  };

  if (!permission) return <View style={styles.container} />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permText}>Camera permission is needed to scan vegetables.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        {/* Scanning overlay */}
        <View style={styles.overlay}>
          <View style={styles.scanBox} />
          <Text style={styles.hint}>Point camera at a vegetable</Text>
        </View>
      </CameraView>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery} disabled={isScanning}>
          <Text style={styles.galleryText}>Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureBtn} onPress={takePicture} disabled={isScanning}>
          {isScanning
            ? <ActivityIndicator color="#fff" size="large" />
            : <View style={styles.captureInner} />
          }
        </TouchableOpacity>

        <View style={{ width: 80 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanBox: {
    width: 250, height: 250,
    borderWidth: 2, borderColor: '#22c55e', borderRadius: 16,
    backgroundColor: 'transparent',
  },
  hint: { color: '#fff', marginTop: 16, fontSize: 14, opacity: 0.8 },
  controls: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    paddingVertical: 30, backgroundColor: '#0f172a',
  },
  captureBtn: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center',
  },
  captureInner: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: '#fff',
  },
  galleryBtn: {
    width: 80, paddingVertical: 10,
    backgroundColor: '#1e293b', borderRadius: 8, alignItems: 'center',
  },
  galleryText: { color: '#e5e7eb', fontSize: 13 },
  permText: { color: '#fff', textAlign: 'center', margin: 20, fontSize: 16 },
  btn: {
    backgroundColor: '#22c55e', paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 8, alignSelf: 'center',
  },
  btnText: { color: '#fff', fontWeight: 'bold' },
});
