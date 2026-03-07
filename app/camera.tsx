import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7,
      });
      if (photo) {
        router.replace({
          pathname: "/receipt-review",
          params: {
            imageUri: photo.uri,
            imageBase64: photo.base64 || "",
          },
        });
      }
    } catch (e) {
      Alert.alert("Error", "Failed to take photo");
    } finally {
      setIsCapturing(false);
    }
  };

  const handleGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        router.replace({
          pathname: "/receipt-review",
          params: {
            imageUri: asset.uri,
            imageBase64: asset.base64 || "",
          },
        });
      }
    } catch (e) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionContainer, { paddingTop: topInset }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Feather name="x" size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.permissionContent}>
          <View style={styles.permissionIcon}>
            <Feather name="camera" size={40} color={Colors.textTertiary} />
          </View>
          <Text style={styles.permissionTitle}>Camera Access</Text>
          <Text style={styles.permissionText}>
            SplitSnap needs camera access to scan receipts
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.permissionButton,
              pressed && { opacity: 0.85 },
            ]}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Allow Camera</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.galleryButton,
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleGallery}
          >
            <Text style={styles.galleryButtonText}>Choose from Gallery Instead</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      >
        <View style={[styles.overlay, { paddingTop: topInset + 8 }]}>
          <View style={styles.topBar}>
            <Pressable
              style={styles.closeCircle}
              onPress={() => router.back()}
            >
              <Feather name="x" size={22} color={Colors.white} />
            </Pressable>
            <Text style={styles.cameraTitle}>Scan Receipt</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>

        <View style={styles.receiptFrame}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
        </View>

        <View
          style={[
            styles.bottomBar,
            { paddingBottom: bottomInset + 24 },
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              styles.galleryCircle,
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleGallery}
          >
            <Ionicons name="images-outline" size={22} color={Colors.white} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.captureButton,
              pressed && { transform: [{ scale: 0.93 }] },
              isCapturing && { opacity: 0.5 },
            ]}
            onPress={handleCapture}
            disabled={isCapturing}
            testID="capture-btn"
          >
            <View style={styles.captureInner} />
          </Pressable>

          <View style={{ width: 48 }} />
        </View>
      </CameraView>
    </View>
  );
}

const cornerSize = 28;
const cornerWidth = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  receiptFrame: {
    flex: 1,
    marginHorizontal: 40,
    marginVertical: 60,
  },
  cornerTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: cornerSize,
    height: cornerSize,
    borderTopWidth: cornerWidth,
    borderLeftWidth: cornerWidth,
    borderColor: Colors.white,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: cornerSize,
    height: cornerSize,
    borderTopWidth: cornerWidth,
    borderRightWidth: cornerWidth,
    borderColor: Colors.white,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: cornerSize,
    height: cornerSize,
    borderBottomWidth: cornerWidth,
    borderLeftWidth: cornerWidth,
    borderColor: Colors.white,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: cornerSize,
    height: cornerSize,
    borderBottomWidth: cornerWidth,
    borderRightWidth: cornerWidth,
    borderColor: Colors.white,
    borderBottomRightRadius: 4,
  },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 24,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  galleryCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: Colors.white,
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.white,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-end",
    marginRight: 16,
    marginTop: 8,
  },
  permissionContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 12,
    paddingBottom: 60,
  },
  permissionIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  permissionTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  permissionText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  permissionButton: {
    height: 48,
    paddingHorizontal: 32,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  permissionButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  galleryButton: {
    paddingVertical: 8,
  },
  galleryButtonText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
});
