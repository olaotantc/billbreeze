import AsyncStorage from "@react-native-async-storage/async-storage";

const ANALYTICS_KEY = "@billbreeze_analytics";

export type AnalyticsEvent =
  | "receipt_scanned"
  | "split_completed"
  | "payment_request_sent"
  | "payment_marked_paid";

type AnalyticsData = Record<AnalyticsEvent, number>;

const DEFAULT_DATA: AnalyticsData = {
  receipt_scanned: 0,
  split_completed: 0,
  payment_request_sent: 0,
  payment_marked_paid: 0,
};

export async function trackEvent(event: AnalyticsEvent, count: number = 1): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(ANALYTICS_KEY);
    const data: AnalyticsData = raw ? JSON.parse(raw) : { ...DEFAULT_DATA };
    data[event] = (data[event] || 0) + count;
    await AsyncStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
  } catch {
    // Analytics should never break the app
  }
}

export async function getAnalytics(): Promise<AnalyticsData> {
  try {
    const raw = await AsyncStorage.getItem(ANALYTICS_KEY);
    return raw ? { ...DEFAULT_DATA, ...JSON.parse(raw) } : { ...DEFAULT_DATA };
  } catch {
    return { ...DEFAULT_DATA };
  }
}
