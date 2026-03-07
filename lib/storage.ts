import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Receipt, PaymentRequest } from "@/shared/schema";

const RECEIPTS_KEY = "@billbreeze_receipts";
const REQUESTS_KEY = "@billbreeze_requests";
const USER_KEY = "@billbreeze_user";

export async function getUser(): Promise<{ email: string; name: string } | null> {
  const data = await AsyncStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
}

export async function setUser(user: { email: string; name: string }): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function clearUser(): Promise<void> {
  await AsyncStorage.removeItem(USER_KEY);
}

export async function getReceipts(): Promise<Receipt[]> {
  const data = await AsyncStorage.getItem(RECEIPTS_KEY);
  return data ? JSON.parse(data) : [];
}

export async function saveReceipt(receipt: Receipt): Promise<void> {
  const receipts = await getReceipts();
  const idx = receipts.findIndex((r) => r.id === receipt.id);
  if (idx >= 0) {
    receipts[idx] = receipt;
  } else {
    receipts.unshift(receipt);
  }
  await AsyncStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts));
}

export async function deleteReceipt(id: string): Promise<void> {
  const receipts = await getReceipts();
  const filtered = receipts.filter((r) => r.id !== id);
  await AsyncStorage.setItem(RECEIPTS_KEY, JSON.stringify(filtered));
}

export async function getPaymentRequests(): Promise<PaymentRequest[]> {
  const data = await AsyncStorage.getItem(REQUESTS_KEY);
  return data ? JSON.parse(data) : [];
}

export async function savePaymentRequest(request: PaymentRequest): Promise<void> {
  const requests = await getPaymentRequests();
  const idx = requests.findIndex((r) => r.id === request.id);
  if (idx >= 0) {
    requests[idx] = request;
  } else {
    requests.unshift(request);
  }
  await AsyncStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
}

export async function savePaymentRequests(newRequests: PaymentRequest[]): Promise<void> {
  const requests = await getPaymentRequests();
  for (const nr of newRequests) {
    const idx = requests.findIndex((r) => r.id === nr.id);
    if (idx >= 0) {
      requests[idx] = nr;
    } else {
      requests.unshift(nr);
    }
  }
  await AsyncStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
}

export async function updatePaymentRequestStatus(
  id: string,
  status: "pending" | "paid"
): Promise<void> {
  const requests = await getPaymentRequests();
  const idx = requests.findIndex((r) => r.id === id);
  if (idx >= 0) {
    requests[idx].status = status;
    await AsyncStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
  }
}
