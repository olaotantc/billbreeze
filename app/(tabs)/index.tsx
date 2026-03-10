import React from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useApp } from "@/lib/app-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import Colors from "@/constants/colors";
import type { Receipt } from "@/shared/schema";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, receipts, removeReceipt, setPendingImage } = useApp();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const handleScan = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push("/camera");
  };

  const handleImport = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const jpeg = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        setPendingImage({ uri: jpeg.uri, base64: jpeg.base64 || "" });
        router.push("/receipt-review");
      }
    } catch (e) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Receipt", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => removeReceipt(id),
      },
    ]);
  };

  const renderReceipt = ({ item }: { item: Receipt }) => (
    <Pressable
      style={({ pressed }) => [
        styles.receiptCard,
        pressed && { opacity: 0.7 },
      ]}
      onPress={() =>
        router.push({
          pathname: "/receipt-review",
          params: { receiptId: item.id },
        })
      }
      onLongPress={() => handleDelete(item.id)}
      testID={`receipt-${item.id}`}
    >
      <View style={styles.receiptLeft}>
        <View style={styles.receiptIcon}>
          <Ionicons name="receipt-outline" size={20} color={Colors.primary} />
        </View>
        <View style={styles.receiptInfo}>
          <Text style={styles.receiptMerchant} numberOfLines={1}>
            {item.merchantName || "Unnamed Receipt"}
          </Text>
          <Text style={styles.receiptDate}>
            {formatDate(item.createdAt)}
            {item.lineItems.length > 0
              ? ` \u00B7 ${item.lineItems.length} items`
              : ""}
          </Text>
        </View>
      </View>
      <View style={styles.receiptRight}>
        <Text style={styles.receiptTotal}>{formatCurrency(item.total, item.currency)}</Text>
        <Feather name="chevron-right" size={16} color={Colors.textTertiary} />
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Hi, {user?.name?.split(" ")[0] || "there"}
          </Text>
          <Text style={styles.headerSubtitle}>Split bills with ease</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={({ pressed }) => [
            styles.scanButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleScan}
          testID="scan-btn"
        >
          <Feather name="camera" size={22} color={Colors.white} />
          <Text style={styles.scanButtonText}>Scan Receipt</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.importButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleImport}
          testID="import-btn"
        >
          <Feather name="image" size={22} color={Colors.primary} />
        </Pressable>
      </View>

      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>Recent Receipts</Text>
        <FlatList
          data={receipts}
          keyExtractor={(item) => item.id}
          renderItem={renderReceipt}
          contentContainerStyle={[
            styles.listContent,
            receipts.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={receipts.length > 0}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="receipt-outline"
                  size={40}
                  color={Colors.textTertiary}
                />
              </View>
              <Text style={styles.emptyTitle}>No receipts yet</Text>
              <Text style={styles.emptyText}>
                Scan a receipt or import a photo to get started
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 12,
  },
  scanButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 14,
    gap: 10,
  },
  scanButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  importButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.surface,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  listSection: {
    flex: 1,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: "center",
  },
  receiptCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  receiptLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  receiptIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
  },
  receiptInfo: {
    flex: 1,
    gap: 2,
  },
  receiptMerchant: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  receiptDate: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  receiptRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  receiptTotal: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  emptyState: {
    alignItems: "center",
    gap: 8,
    paddingBottom: 60,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    maxWidth: 240,
  },
});
