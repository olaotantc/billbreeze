import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

const LAST_UPDATED = "March 11, 2026";

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.navButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: bottomInset + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last updated: {LAST_UPDATED}</Text>

        <Section title="What BillBreeze Does">
          <P>
            BillBreeze helps you split restaurant bills with friends. You scan a
            receipt with your camera, the app reads the items and prices, and
            then calculates what each person owes. You can share payment requests
            via text message or other apps.
          </P>
        </Section>

        <Section title="Data We Collect">
          <P>
            BillBreeze stores all data locally on your device. We do not have
            user accounts, servers, or databases that store your information.
          </P>
          <Bullet>
            Your name and email (stored only on your device for display purposes)
          </Bullet>
          <Bullet>
            Receipt data including merchant names, items, and prices (stored only
            on your device)
          </Bullet>
          <Bullet>
            Payment handles you enter for Venmo, PayPal, or Cash App (stored
            only on your device)
          </Bullet>
        </Section>

        <Section title="Camera and Photo Library">
          <P>
            BillBreeze uses your camera or photo library solely to capture
            receipt images for text extraction. Receipt images are processed
            on-device and are not uploaded to any server or stored permanently.
          </P>
        </Section>

        <Section title="On-Device Processing">
          <P>
            Receipt text recognition (OCR) runs entirely on your device. No
            receipt images or extracted text are sent to external servers. All
            parsing and calculations happen locally.
          </P>
        </Section>

        <Section title="Third-Party Services">
          <P>
            BillBreeze does not use third-party analytics SDKs, advertising,
            or cross-app tracking services. The app maintains simple on-device
            usage counters (for example, how often certain features are used) to
            help us improve the experience; these counters are stored only on
            your device, are not linked to your identity, and are never sent to
            any server or shared with third parties. When you share a payment
            request, BillBreeze uses your device's built-in share functionality
            — we do not see or store the messages you send.
          </P>
        </Section>

        <Section title="Data Retention">
          <P>
            All data is stored locally using your device's storage. Uninstalling
            BillBreeze permanently deletes all stored data. There is no backup
            or cloud sync.
          </P>
        </Section>

        <Section title="Children's Privacy">
          <P>
            BillBreeze is not directed at children under 13. We do not knowingly
            collect personal information from children.
          </P>
        </Section>

        <Section title="Changes to This Policy">
          <P>
            We may update this privacy policy from time to time. Changes will be
            reflected in the app with an updated date.
          </P>
        </Section>

        <Section title="Contact">
          <P>
            If you have questions about this privacy policy, contact us at
            support@billbreeze.app.
          </P>
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>{"\u2022"}</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    paddingHorizontal: 24,
  },
  lastUpdated: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: "row",
    paddingLeft: 8,
    marginBottom: 6,
  },
  bulletDot: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginRight: 8,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});
