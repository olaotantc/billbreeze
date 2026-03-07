import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  Share,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useApp } from "@/lib/app-context";
import { formatCurrency, generateId } from "@/lib/utils";
import Colors from "@/constants/colors";
import type { PaymentRequest } from "@/shared/schema";

export default function PaymentSummaryScreen() {
  const insets = useSafeAreaInsets();
  const { receiptId } = useLocalSearchParams<{ receiptId: string }>();
  const { receipts, addPaymentRequests } = useApp();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const receipt = receipts.find((r) => r.id === receiptId);

  if (!receipt) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <Text style={styles.errorText}>Receipt not found</Text>
      </View>
    );
  }

  const getPayerBreakdown = () => {
    const breakdown: Record<string, { items: { name: string; amount: number }[]; subtotal: number; taxTip: number; total: number }> = {};

    receipt.payers.forEach((p) => {
      breakdown[p] = { items: [], subtotal: 0, taxTip: 0, total: 0 };
    });

    if (receipt.splitMode === "equal") {
      const perPerson = receipt.total / receipt.payers.length;
      receipt.payers.forEach((p) => {
        breakdown[p].total = perPerson;
        breakdown[p].subtotal = perPerson;
      });
    } else if (receipt.splitMode === "itemized") {
      receipt.lineItems.forEach((item) => {
        if (item.assignedTo.length > 0) {
          const share = item.price / item.assignedTo.length;
          item.assignedTo.forEach((p) => {
            if (breakdown[p]) {
              breakdown[p].items.push({ name: item.name, amount: share });
              breakdown[p].subtotal += share;
            }
          });
        }
      });

      const subtotal = receipt.subtotal || receipt.lineItems.reduce((s, i) => s + i.price, 0);
      const taxTipTotal = receipt.tax + receipt.tip;

      receipt.payers.forEach((p) => {
        if (subtotal > 0 && taxTipTotal > 0) {
          const proportion = breakdown[p].subtotal / subtotal;
          breakdown[p].taxTip = proportion * taxTipTotal;
        }
        breakdown[p].total = breakdown[p].subtotal + breakdown[p].taxTip;
      });
    }

    return breakdown;
  };

  const breakdown = getPayerBreakdown();

  const handleShare = async (payerName: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const amount = breakdown[payerName]?.total || 0;
    const message = `Hey ${payerName}! You owe ${formatCurrency(amount)} for ${receipt.merchantName || "our meal"}. Thanks!`;

    try {
      await Share.share({
        message,
        title: `Payment Request - ${receipt.merchantName}`,
      });
    } catch (e) {
      // user cancelled
    }
  };

  const handleShareAll = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    const lines = receipt.payers
      .map((p) => `${p}: ${formatCurrency(breakdown[p]?.total || 0)}`)
      .join("\n");

    const message = `Bill Split for ${receipt.merchantName || "our meal"}\n\n${lines}\n\nTotal: ${formatCurrency(receipt.total)}`;

    try {
      await Share.share({
        message,
        title: `Bill Split - ${receipt.merchantName}`,
      });
    } catch (e) {
      // user cancelled
    }
  };

  const handleSaveRequests = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const requests: PaymentRequest[] = receipt.payers.map((payer) => ({
      id: generateId(),
      receiptId: receipt.id,
      payerName: payer,
      amount: breakdown[payer]?.total || 0,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    }));

    await addPaymentRequests(requests);
    Alert.alert(
      "Requests Saved",
      `${requests.length} payment requests have been saved to your inbox.`,
      [
        {
          text: "View Inbox",
          onPress: () => router.replace("/(tabs)/inbox"),
        },
        {
          text: "Done",
          onPress: () => router.replace("/(tabs)"),
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.navButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Payment Summary</Text>
        <Pressable style={styles.navButton} onPress={handleShareAll}>
          <Feather name="share-2" size={20} color={Colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.merchantName}>
            {receipt.merchantName || "Bill Split"}
          </Text>
          <Text style={styles.totalAmount}>{formatCurrency(receipt.total)}</Text>
          <Text style={styles.splitInfo}>
            Split {receipt.splitMode === "equal" ? "equally" : "by items"} among{" "}
            {receipt.payers.length} people
          </Text>
        </View>

        {receipt.payers.map((payer) => {
          const data = breakdown[payer];
          if (!data) return null;

          return (
            <View key={payer} style={styles.payerCard}>
              <View style={styles.payerHeader}>
                <View style={styles.payerAvatar}>
                  <Text style={styles.payerAvatarText}>
                    {payer.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.payerInfo}>
                  <Text style={styles.payerName}>{payer}</Text>
                  {data.items.length > 0 && (
                    <Text style={styles.payerItemCount}>
                      {data.items.length} item{data.items.length !== 1 ? "s" : ""}
                    </Text>
                  )}
                </View>
                <Text style={styles.payerTotal}>
                  {formatCurrency(data.total)}
                </Text>
              </View>

              {data.items.length > 0 && (
                <View style={styles.payerItems}>
                  {data.items.map((item, idx) => (
                    <View key={idx} style={styles.payerItemRow}>
                      <Text style={styles.payerItemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.payerItemAmount}>
                        {formatCurrency(item.amount)}
                      </Text>
                    </View>
                  ))}
                  {data.taxTip > 0 && (
                    <View style={styles.payerItemRow}>
                      <Text style={styles.payerItemName}>Tax & Tip</Text>
                      <Text style={styles.payerItemAmount}>
                        {formatCurrency(data.taxTip)}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.shareButton,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => handleShare(payer)}
              >
                <Feather name="send" size={14} color={Colors.primary} />
                <Text style={styles.shareButtonText}>Send Request</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: bottomInset + 16 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
          onPress={handleSaveRequests}
          testID="save-requests-btn"
        >
          <Ionicons name="checkmark-circle-outline" size={22} color={Colors.white} />
          <Text style={styles.saveButtonText}>Save Payment Requests</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 16,
  },
  summaryCard: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 4,
  },
  merchantName: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
  },
  totalAmount: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
    letterSpacing: -1,
  },
  splitInfo: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    marginTop: 4,
  },
  payerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  payerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  payerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  payerAvatarText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  payerInfo: {
    flex: 1,
    gap: 2,
  },
  payerName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  payerItemCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  payerTotal: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  payerItems: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 10,
    gap: 6,
  },
  payerItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  payerItemName: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  payerItemAmount: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
  },
  shareButtonText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 14,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
});
