import React from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useApp } from "@/lib/app-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import Colors from "@/constants/colors";
import type { PaymentRequest } from "@/shared/schema";

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const { paymentRequests, toggleRequestStatus } = useApp();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const pendingRequests = paymentRequests.filter((r) => r.status === "pending");
  const paidRequests = paymentRequests.filter((r) => r.status === "paid");

  const handleToggle = (id: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    toggleRequestStatus(id);
  };

  const renderRequest = ({ item }: { item: PaymentRequest }) => (
    <Pressable
      style={({ pressed }) => [
        styles.requestCard,
        pressed && { opacity: 0.7 },
      ]}
      onPress={() => handleToggle(item.id)}
      testID={`request-${item.id}`}
    >
      <View style={styles.requestLeft}>
        <View
          style={[
            styles.statusDot,
            item.status === "paid" ? styles.paidDot : styles.pendingDot,
          ]}
        >
          {item.status === "paid" ? (
            <Feather name="check" size={14} color={Colors.white} />
          ) : (
            <Feather name="clock" size={14} color={Colors.accent} />
          )}
        </View>
        <View style={styles.requestInfo}>
          <Text style={styles.requestName}>{item.payerName}</Text>
          <Text style={styles.requestDate}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>
      <View style={styles.requestRight}>
        <Text
          style={[
            styles.requestAmount,
            item.status === "paid" && styles.paidAmount,
          ]}
        >
          {formatCurrency(item.amount)}
        </Text>
        <View
          style={[
            styles.statusBadge,
            item.status === "paid" ? styles.paidBadge : styles.pendingBadge,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              item.status === "paid"
                ? styles.paidText
                : styles.pendingText,
            ]}
          >
            {item.status === "paid" ? "Paid" : "Pending"}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  const allRequests = [...pendingRequests, ...paidRequests];

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Payment Requests</Text>
        {paymentRequests.length > 0 && (
          <Text style={styles.subtitle}>
            {pendingRequests.length} pending
            {paidRequests.length > 0 ? ` \u00B7 ${paidRequests.length} settled` : ""}
          </Text>
        )}
      </View>

      <FlatList
        data={allRequests}
        keyExtractor={(item) => item.id}
        renderItem={renderRequest}
        contentContainerStyle={[
          styles.listContent,
          allRequests.length === 0 && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={allRequests.length > 0}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="mail-outline"
                size={40}
                color={Colors.textTertiary}
              />
            </View>
            <Text style={styles.emptyTitle}>No requests yet</Text>
            <Text style={styles.emptyText}>
              Split a receipt and share payment requests to see them here
            </Text>
          </View>
        }
      />
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
    paddingBottom: 16,
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: "center",
  },
  requestCard: {
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
  requestLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  statusDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  pendingDot: {
    backgroundColor: "#FFF8E6",
  },
  paidDot: {
    backgroundColor: Colors.success,
  },
  requestInfo: {
    flex: 1,
    gap: 2,
  },
  requestName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  requestDate: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  requestRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  requestAmount: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  paidAmount: {
    color: Colors.success,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pendingBadge: {
    backgroundColor: "#FFF8E6",
  },
  paidBadge: {
    backgroundColor: "#E8F8F0",
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  pendingText: {
    color: "#B88A00",
  },
  paidText: {
    color: Colors.success,
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
