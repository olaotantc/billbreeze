import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useApp } from "@/lib/app-context";
import Colors from "@/constants/colors";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut, paymentHandles, updatePaymentHandles } = useApp();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const [venmo, setVenmo] = useState(paymentHandles.venmo || "");
  const [paypal, setPaypal] = useState(paymentHandles.paypal || "");
  const [cashapp, setCashapp] = useState(paymentHandles.cashapp || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setVenmo(paymentHandles.venmo || "");
    setPaypal(paymentHandles.paypal || "");
    setCashapp(paymentHandles.cashapp || "");
  }, [paymentHandles.venmo, paymentHandles.paypal, paymentHandles.cashapp]);

  const hasChanges =
    venmo !== (paymentHandles.venmo || "") ||
    paypal !== (paymentHandles.paypal || "") ||
    cashapp !== (paymentHandles.cashapp || "");

  const handleSaveHandles = async () => {
    setIsSaving(true);
    try {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      await updatePaymentHandles({
        venmo: venmo.trim() || undefined,
        paypal: paypal.trim() || undefined,
        cashapp: cashapp.trim() || undefined,
      });
      Alert.alert("Saved", "Your payment links have been updated. They will be included in all future payment requests.");
    } catch (e) {
      Alert.alert("Error", "Failed to save payment links");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          await signOut();
          router.replace("/");
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: bottomInset + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || "?"}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || "Guest"}</Text>
              <Text style={styles.profileEmail}>{user?.email || ""}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Links</Text>
          <Text style={styles.sectionSubtitle}>
            Add your payment handles so recipients can pay you directly from shared requests
          </Text>

          <View style={styles.inputGroup}>
            <View style={styles.inputRow}>
              <View style={[styles.inputIcon, { backgroundColor: "#008CFF" }]}>
                <Text style={styles.inputIconText}>V</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Venmo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="username (without @)"
                  placeholderTextColor={Colors.textTertiary}
                  value={venmo}
                  onChangeText={setVenmo}
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="venmo-input"
                />
              </View>
            </View>

            <View style={styles.inputDivider} />

            <View style={styles.inputRow}>
              <View style={[styles.inputIcon, { backgroundColor: "#003087" }]}>
                <Text style={styles.inputIconText}>P</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>PayPal</Text>
                <TextInput
                  style={styles.input}
                  placeholder="paypal.me username"
                  placeholderTextColor={Colors.textTertiary}
                  value={paypal}
                  onChangeText={setPaypal}
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="paypal-input"
                />
              </View>
            </View>

            <View style={styles.inputDivider} />

            <View style={styles.inputRow}>
              <View style={[styles.inputIcon, { backgroundColor: "#00D632" }]}>
                <Text style={styles.inputIconText}>$</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Cash App</Text>
                <TextInput
                  style={styles.input}
                  placeholder="$cashtag (without $)"
                  placeholderTextColor={Colors.textTertiary}
                  value={cashapp}
                  onChangeText={setCashapp}
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="cashapp-input"
                />
              </View>
            </View>
          </View>

          {hasChanges && (
            <Pressable
              style={({ pressed }) => [
                styles.saveHandlesButton,
                pressed && { opacity: 0.9 },
                isSaving && { opacity: 0.6 },
              ]}
              onPress={handleSaveHandles}
              disabled={isSaving}
              testID="save-handles-btn"
            >
              <Feather name="check" size={16} color={Colors.white} />
              <Text style={styles.saveHandlesText}>
                {isSaving ? "Saving..." : "Save Payment Links"}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          <SettingRow icon="info" label="About BillBreeze" />
          <SettingRow icon="shield" label="Privacy" />
          <SettingRow icon="help-circle" label="Help & Support" />
        </View>

        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [
              styles.signOutButton,
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleSignOut}
            testID="sign-out-btn"
          >
            <Feather name="log-out" size={18} color={Colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>

        <Text style={styles.version}>BillBreeze v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

function SettingRow({ icon, label }: { icon: string; label: string }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.settingRow,
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.settingRowLeft}>
        <Feather name={icon as any} size={18} color={Colors.textSecondary} />
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={Colors.textTertiary} />
    </Pressable>
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
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  profileInfo: {
    gap: 2,
  },
  profileName: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  inputGroup: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: "hidden",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  inputIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  inputIconText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  inputWrapper: {
    flex: 1,
    gap: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  input: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    padding: 0,
    height: 24,
  },
  inputDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 58,
  },
  saveHandlesButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    marginTop: 12,
  },
  saveHandlesText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  settingRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
  },
  signOutText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.error,
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    paddingBottom: 40,
  },
});
