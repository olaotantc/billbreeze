import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
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
import { formatCurrency, generateId } from "@/lib/utils";
import Colors from "@/constants/colors";

type SplitMode = "equal" | "itemized";

export default function SplitConfigScreen() {
  const insets = useSafeAreaInsets();
  const { receiptId } = useLocalSearchParams<{ receiptId: string }>();
  const { receipts, updateReceipt } = useApp();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const receipt = receipts.find((r) => r.id === receiptId);

  const [splitMode, setSplitMode] = useState<SplitMode>(
    (receipt?.splitMode as SplitMode) || "equal"
  );
  const [payers, setPayers] = useState<string[]>(receipt?.payers || []);
  const [newPayer, setNewPayer] = useState("");
  const [includeTax, setIncludeTax] = useState(true);
  const [includeTip, setIncludeTip] = useState(true);

  if (!receipt) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <Text style={styles.errorText}>Receipt not found</Text>
      </View>
    );
  }

  const effectiveTotal =
    receipt.subtotal +
    (includeTax ? receipt.tax : 0) +
    (includeTip ? receipt.tip : 0);

  const perPerson = payers.length > 0 ? effectiveTotal / payers.length : 0;

  const addPayer = () => {
    const name = newPayer.trim();
    if (!name) return;
    if (payers.includes(name)) {
      Alert.alert("Duplicate", "This person is already added.");
      return;
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setPayers((prev) => [...prev, name]);
    setNewPayer("");
  };

  const removePayer = (name: string) => {
    setPayers((prev) => prev.filter((p) => p !== name));
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = async () => {
    if (isSaving) return;
    if (payers.length < 2) {
      Alert.alert("Need People", "Add at least 2 people to split the bill.");
      return;
    }

    setIsSaving(true);

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const updated = {
      ...receipt,
      splitMode,
      payers,
      tax: includeTax ? receipt.tax : 0,
      tip: includeTip ? receipt.tip : 0,
      total: effectiveTotal,
    };

    await updateReceipt(updated);

    if (splitMode === "itemized") {
      router.push({
        pathname: "/payer-assignment",
        params: { receiptId: receipt.id },
      });
    } else {
      router.push({
        pathname: "/payment-summary",
        params: { receiptId: receipt.id },
      });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.navButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Split the Bill</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total to Split</Text>
          <Text style={styles.totalAmount}>{formatCurrency(effectiveTotal)}</Text>
          <Text style={styles.totalBreakdown}>
            {receipt.lineItems.length} items
            {includeTax && receipt.tax > 0 ? ` + ${formatCurrency(receipt.tax)} tax` : ""}
            {includeTip && receipt.tip > 0 ? ` + ${formatCurrency(receipt.tip)} tip` : ""}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Split Mode</Text>
          <View style={styles.modeRow}>
            {(["equal", "itemized"] as SplitMode[]).map((mode) => (
              <Pressable
                key={mode}
                style={[
                  styles.modeButton,
                  splitMode === mode && styles.modeButtonActive,
                ]}
                onPress={() => setSplitMode(mode)}
              >
                <Feather
                  name={
                    mode === "equal"
                      ? "divide"
                      : "list"
                  }
                  size={18}
                  color={splitMode === mode ? Colors.white : Colors.primary}
                />
                <Text
                  style={[
                    styles.modeText,
                    splitMode === mode && styles.modeTextActive,
                  ]}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Include</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>
              Tax ({formatCurrency(receipt.tax)})
            </Text>
            <Pressable
              style={[styles.toggle, includeTax && styles.toggleActive]}
              onPress={() => setIncludeTax(!includeTax)}
            >
              <View
                style={[
                  styles.toggleThumb,
                  includeTax && styles.toggleThumbActive,
                ]}
              />
            </Pressable>
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>
              Tip ({formatCurrency(receipt.tip)})
            </Text>
            <Pressable
              style={[styles.toggle, includeTip && styles.toggleActive]}
              onPress={() => setIncludeTip(!includeTip)}
            >
              <View
                style={[
                  styles.toggleThumb,
                  includeTip && styles.toggleThumbActive,
                ]}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>People ({payers.length})</Text>
          <View style={styles.addPayerRow}>
            <TextInput
              style={styles.payerInput}
              placeholder="Add a person"
              placeholderTextColor={Colors.textTertiary}
              value={newPayer}
              onChangeText={setNewPayer}
              onSubmitEditing={addPayer}
              returnKeyType="done"
              testID="payer-input"
            />
            <Pressable
              style={({ pressed }) => [
                styles.addPayerButton,
                pressed && { opacity: 0.7 },
              ]}
              onPress={addPayer}
              testID="add-payer-btn"
            >
              <Feather name="plus" size={20} color={Colors.white} />
            </Pressable>
          </View>

          <View style={styles.payersList}>
            {payers.map((payer) => (
              <View key={payer} style={styles.payerChip}>
                <Text style={styles.payerChipText}>{payer}</Text>
                {splitMode === "equal" && payers.length > 0 && (
                  <Text style={styles.payerAmount}>
                    {formatCurrency(perPerson)}
                  </Text>
                )}
                <Pressable
                  style={styles.payerRemove}
                  onPress={() => removePayer(payer)}
                >
                  <Feather name="x" size={14} color={Colors.textTertiary} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: bottomInset + 16 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.continueButton,
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            payers.length < 2 && styles.continueDisabled,
          ]}
          onPress={handleContinue}
          disabled={payers.length < 2}
          testID="split-continue-btn"
        >
          <Text
            style={[
              styles.continueText,
              payers.length < 2 && styles.continueTextDisabled,
            ]}
          >
            {splitMode === "itemized" ? "Assign Items" : "View Summary"}
          </Text>
          <Feather
            name="arrow-right"
            size={20}
            color={payers.length < 2 ? Colors.textTertiary : Colors.white}
          />
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
    gap: 24,
  },
  totalCard: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 4,
  },
  totalLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
  },
  totalAmount: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
    letterSpacing: -1,
  },
  totalBreakdown: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    marginTop: 4,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
  },
  modeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  modeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  modeText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  modeTextActive: {
    color: Colors.white,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  toggleLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.borderLight,
    padding: 2,
    justifyContent: "center",
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
  addPayerRow: {
    flexDirection: "row",
    gap: 8,
  },
  payerInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  addPayerButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  payersList: {
    gap: 8,
  },
  payerChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingLeft: 14,
    paddingRight: 8,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  payerChipText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  payerAmount: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
    marginRight: 8,
  },
  payerRemove: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
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
  continueDisabled: {
    backgroundColor: Colors.borderLight,
  },
  continueText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  continueTextDisabled: {
    color: Colors.textTertiary,
  },
});
