import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useApp } from "@/lib/app-context";
import { generateId, formatCurrency } from "@/lib/utils";
import { getApiUrl } from "@/lib/query-client";
import Colors from "@/constants/colors";
import type { LineItem, Receipt } from "@/shared/schema";

export default function ReceiptReviewScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    imageUri?: string;
    imageBase64?: string;
    receiptId?: string;
  }>();
  const { receipts, addReceipt, updateReceipt } = useApp();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const existingReceipt = params.receiptId
    ? receipts.find((r) => r.id === params.receiptId)
    : null;

  const [merchantName, setMerchantName] = useState(existingReceipt?.merchantName || "");
  const [lineItems, setLineItems] = useState<LineItem[]>(existingReceipt?.lineItems || []);
  const [tax, setTax] = useState(existingReceipt?.tax?.toString() || "0");
  const [tip, setTip] = useState(existingReceipt?.tip?.toString() || "0");
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(!!existingReceipt);

  const subtotal = lineItems.reduce((sum, item) => sum + item.price, 0);
  const total = subtotal + (parseFloat(tax) || 0) + (parseFloat(tip) || 0);

  useEffect(() => {
    if (params.imageBase64 && !existingReceipt) {
      scanReceipt(params.imageBase64);
    }
  }, []);

  const scanReceipt = async (base64: string) => {
    setIsScanning(true);
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/ocr/parse", baseUrl);
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      if (response.ok) {
        const data = await response.json();
        setMerchantName(data.merchantName || "");
        if (data.lineItems && data.lineItems.length > 0) {
          setLineItems(
            data.lineItems.map((item: { name: string; price: number }) => ({
              id: generateId(),
              name: item.name,
              price: item.price,
              assignedTo: [],
            }))
          );
        }
        if (data.tax) setTax(data.tax.toString());
        if (data.total && data.subtotal) {
          const diff = data.total - data.subtotal - (data.tax || 0);
          if (diff > 0) setTip(diff.toFixed(2));
        }
        setScanComplete(true);
      } else {
        setScanComplete(true);
        Alert.alert(
          "Scan Issue",
          "Could not read the receipt clearly. You can add items manually."
        );
      }
    } catch (e) {
      setScanComplete(true);
      Alert.alert(
        "Scan Issue",
        "Could not connect to scanning service. You can add items manually."
      );
    } finally {
      setIsScanning(false);
    }
  };

  const addItem = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setLineItems((prev) => [
      ...prev,
      { id: generateId(), name: "", price: 0, assignedTo: [] },
    ]);
  };

  const updateItem = (id: string, field: "name" | "price", value: string) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === "name") return { ...item, name: value };
        return { ...item, price: parseFloat(value) || 0 };
      })
    );
  };

  const removeItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleContinue = async () => {
    if (lineItems.length === 0) {
      Alert.alert("No Items", "Add at least one item to continue.");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const receipt: Receipt = {
      id: existingReceipt?.id || generateId(),
      merchantName: merchantName || "Receipt",
      date: existingReceipt?.date || "",
      imageUri: params.imageUri || existingReceipt?.imageUri,
      lineItems,
      subtotal,
      tax: parseFloat(tax) || 0,
      tip: parseFloat(tip) || 0,
      total,
      splitMode: existingReceipt?.splitMode || "equal",
      payers: existingReceipt?.payers || [],
      createdAt: existingReceipt?.createdAt || new Date().toISOString(),
    };

    if (existingReceipt) {
      await updateReceipt(receipt);
    } else {
      await addReceipt(receipt);
    }

    router.push({
      pathname: "/split-config",
      params: { receiptId: receipt.id },
    });
  };

  if (isScanning) {
    return (
      <View style={[styles.scanningContainer, { paddingTop: topInset }]}>
        <View style={styles.scanningContent}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.scanningTitle}>Scanning Receipt</Text>
          <Text style={styles.scanningText}>
            Extracting items and prices...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.navButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Review Receipt</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.merchantSection}>
          <Text style={styles.fieldLabel}>Merchant</Text>
          <TextInput
            style={styles.merchantInput}
            placeholder="Restaurant name"
            placeholderTextColor={Colors.textTertiary}
            value={merchantName}
            onChangeText={setMerchantName}
            testID="merchant-input"
          />
        </View>

        <View style={styles.itemsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Items ({lineItems.length})
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.addItemButton,
                pressed && { opacity: 0.7 },
              ]}
              onPress={addItem}
              testID="add-item-btn"
            >
              <Feather name="plus" size={18} color={Colors.primary} />
              <Text style={styles.addItemText}>Add</Text>
            </Pressable>
          </View>

          {lineItems.map((item, index) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInputs}>
                <TextInput
                  style={styles.itemNameInput}
                  placeholder="Item name"
                  placeholderTextColor={Colors.textTertiary}
                  value={item.name}
                  onChangeText={(v) => updateItem(item.id, "name", v)}
                />
                <TextInput
                  style={styles.itemPriceInput}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textTertiary}
                  value={item.price > 0 ? item.price.toString() : ""}
                  onChangeText={(v) => updateItem(item.id, "price", v)}
                  keyboardType="decimal-pad"
                />
              </View>
              <Pressable
                style={styles.removeButton}
                onPress={() => removeItem(item.id)}
              >
                <Feather name="x" size={16} color={Colors.textTertiary} />
              </Pressable>
            </View>
          ))}

          {lineItems.length === 0 && (
            <View style={styles.noItems}>
              <Text style={styles.noItemsText}>
                No items yet. Tap "Add" to add items manually.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax</Text>
            <View style={styles.totalInputWrapper}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.totalInput}
                value={tax}
                onChangeText={setTax}
                keyboardType="decimal-pad"
                testID="tax-input"
              />
            </View>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tip</Text>
            <View style={styles.totalInputWrapper}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.totalInput}
                value={tip}
                onChangeText={setTip}
                keyboardType="decimal-pad"
                testID="tip-input"
              />
            </View>
          </View>

          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>
              {formatCurrency(total)}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: bottomInset + 16 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.continueButton,
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
          onPress={handleContinue}
          testID="continue-btn"
        >
          <Text style={styles.continueText}>Continue to Split</Text>
          <Feather name="arrow-right" size={20} color={Colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scanningContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scanningContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingBottom: 60,
  },
  scanningTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  scanningText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 24,
  },
  merchantSection: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  merchantInput: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  itemsSection: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  addItemButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surfaceAlt,
  },
  addItemText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemInputs: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
  },
  itemNameInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  itemPriceInput: {
    width: 80,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    backgroundColor: Colors.surface,
    textAlign: "right",
  },
  removeButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  noItems: {
    padding: 24,
    alignItems: "center",
  },
  noItemsText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
  },
  totalsSection: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  totalValue: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  totalInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    paddingLeft: 8,
    backgroundColor: Colors.background,
  },
  dollarSign: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  totalInput: {
    width: 64,
    height: 36,
    paddingHorizontal: 4,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    textAlign: "right",
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 12,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  grandTotalValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 14,
    gap: 8,
  },
  continueText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
});
