import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useApp } from "@/lib/app-context";
import { formatCurrency, roundCents } from "@/lib/utils";
import Colors from "@/constants/colors";
import type { LineItem } from "@/shared/schema";

export default function PayerAssignmentScreen() {
  const insets = useSafeAreaInsets();
  const { receiptId } = useLocalSearchParams<{ receiptId: string }>();
  const { receipts, updateReceipt } = useApp();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const receipt = receipts.find((r) => r.id === receiptId);
  const [assignments, setAssignments] = useState<Record<string, string[]>>(
    () => {
      if (!receipt) return {};
      const map: Record<string, string[]> = {};
      receipt.lineItems.forEach((item) => {
        map[item.id] = item.assignedTo || [];
      });
      return map;
    }
  );

  if (!receipt) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <Text style={styles.errorText}>Receipt not found</Text>
      </View>
    );
  }

  const toggleAssignment = (itemId: string, payer: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setAssignments((prev) => {
      const current = prev[itemId] || [];
      const updated = current.includes(payer)
        ? current.filter((p) => p !== payer)
        : [...current, payer];
      return { ...prev, [itemId]: updated };
    });
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = async () => {
    if (isSaving) return;

    const unassigned = receipt.lineItems.filter((item) => (assignments[item.id] || []).length === 0);
    if (unassigned.length > 0) {
      Alert.alert(
        "Unassigned Items",
        `${unassigned.length} item${unassigned.length > 1 ? "s" : ""} ha${unassigned.length > 1 ? "ve" : "s"} no one assigned. Their cost won't be split.`,
        [
          { text: "Go Back", style: "cancel" },
          { text: "Continue Anyway", onPress: () => proceedWithSave() },
        ]
      );
      return;
    }

    proceedWithSave();
  };

  const proceedWithSave = async () => {
    setIsSaving(true);
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const updatedItems = receipt.lineItems.map((item) => ({
        ...item,
        assignedTo: assignments[item.id] || [],
      }));

      await updateReceipt({ ...receipt, lineItems: updatedItems });
      router.push({
        pathname: "/payment-summary",
        params: { receiptId: receipt.id },
      });
    } catch (e) {
      Alert.alert("Error", "Failed to save assignments. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const getPayerTotals = () => {
    const totals: Record<string, number> = {};
    receipt.payers.forEach((p) => (totals[p] = 0));

    receipt.lineItems.forEach((item) => {
      const assignedPayers = assignments[item.id] || [];
      if (assignedPayers.length > 0) {
        const share = roundCents(item.price / assignedPayers.length);
        assignedPayers.forEach((p) => {
          totals[p] = (totals[p] || 0) + share;
        });
      }
    });

    const taxTipTotal = receipt.tax + receipt.tip;
    const subtotal = receipt.subtotal ?? receipt.lineItems.reduce((s, i) => s + i.price, 0);

    if (subtotal > 0 && taxTipTotal > 0) {
      Object.keys(totals).forEach((p) => {
        const proportion = totals[p] / subtotal;
        totals[p] = roundCents(totals[p] + proportion * taxTipTotal);
      });
    }

    return totals;
  };

  const payerTotals = getPayerTotals();

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.navButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Assign Items</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.payerSummaryRow}>
        {receipt.payers.map((payer) => (
          <View key={payer} style={styles.payerSummaryChip}>
            <Text style={styles.payerSummaryName} numberOfLines={1}>
              {payer}
            </Text>
            <Text style={styles.payerSummaryAmount}>
              {formatCurrency(payerTotals[payer] || 0, receipt.currency)}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {receipt.lineItems.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name || "Unnamed Item"}
              </Text>
              <Text style={styles.itemPrice}>{formatCurrency(item.price, receipt.currency)}</Text>
            </View>
            <View style={styles.payerButtons}>
              {receipt.payers.map((payer) => {
                const isAssigned = (assignments[item.id] || []).includes(payer);
                return (
                  <Pressable
                    key={payer}
                    style={[
                      styles.payerButton,
                      isAssigned && styles.payerButtonActive,
                    ]}
                    onPress={() => toggleAssignment(item.id, payer)}
                  >
                    <Text
                      style={[
                        styles.payerButtonText,
                        isAssigned && styles.payerButtonTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {payer}
                    </Text>
                    {isAssigned && (
                      <Feather name="check" size={14} color={Colors.white} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: bottomInset + 16 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.continueButton,
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
          onPress={handleContinue}
          disabled={isSaving}
          testID="assignment-continue-btn"
        >
          <Text style={styles.continueText}>View Summary</Text>
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
  errorText: {
    textAlign: "center",
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 100,
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
  payerSummaryRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 16,
  },
  payerSummaryChip: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    gap: 2,
  },
  payerSummaryName: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  payerSummaryAmount: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 12,
  },
  itemCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemName: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  payerButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  payerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  payerButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  payerButtonText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  payerButtonTextActive: {
    color: Colors.white,
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
