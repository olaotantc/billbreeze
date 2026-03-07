import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import type { Receipt, PaymentRequest } from "@/shared/schema";
import * as Storage from "@/lib/storage";
import type { PaymentHandles } from "@/lib/storage";

interface PendingImage {
  uri: string;
  base64: string;
}

interface AppContextValue {
  user: { email: string; name: string } | null;
  isLoading: boolean;
  receipts: Receipt[];
  paymentRequests: PaymentRequest[];
  paymentHandles: PaymentHandles;
  pendingImage: PendingImage | null;
  setPendingImage: (image: PendingImage | null) => void;
  signIn: (email: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  addReceipt: (receipt: Receipt) => Promise<void>;
  updateReceipt: (receipt: Receipt) => Promise<void>;
  removeReceipt: (id: string) => Promise<void>;
  addPaymentRequests: (requests: PaymentRequest[]) => Promise<void>;
  toggleRequestStatus: (id: string) => Promise<void>;
  updatePaymentHandles: (handles: PaymentHandles) => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [paymentHandles, setPaymentHandles] = useState<PaymentHandles>({});
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [savedUser, savedReceipts, savedRequests, savedHandles] = await Promise.all([
        Storage.getUser(),
        Storage.getReceipts(),
        Storage.getPaymentRequests(),
        Storage.getPaymentHandles(),
      ]);
      setUser(savedUser);
      setReceipts(savedReceipts);
      setPaymentRequests(savedRequests);
      setPaymentHandles(savedHandles);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const signIn = useCallback(async (email: string, name: string) => {
    await Storage.setUser({ email, name });
    setUser({ email, name });
  }, []);

  const signOut = useCallback(async () => {
    await Storage.clearUser();
    setUser(null);
  }, []);

  const addReceipt = useCallback(async (receipt: Receipt) => {
    await Storage.saveReceipt(receipt);
    setReceipts((prev) => [receipt, ...prev]);
  }, []);

  const updateReceipt = useCallback(async (receipt: Receipt) => {
    await Storage.saveReceipt(receipt);
    setReceipts((prev) => prev.map((r) => (r.id === receipt.id ? receipt : r)));
  }, []);

  const removeReceipt = useCallback(async (id: string) => {
    await Storage.deleteReceipt(id);
    setReceipts((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const addPaymentRequests = useCallback(async (requests: PaymentRequest[]) => {
    await Storage.savePaymentRequests(requests);
    setPaymentRequests((prev) => [...requests, ...prev]);
  }, []);

  const updatePaymentHandles = useCallback(async (handles: PaymentHandles) => {
    await Storage.setPaymentHandles(handles);
    setPaymentHandles(handles);
  }, []);

  const toggleRequestStatus = useCallback(async (id: string) => {
    const request = paymentRequests.find((r) => r.id === id);
    if (!request) return;
    const newStatus = request.status === "pending" ? "paid" : "pending";
    await Storage.updatePaymentRequestStatus(id, newStatus);
    setPaymentRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
  }, [paymentRequests]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      receipts,
      paymentRequests,
      paymentHandles,
      pendingImage,
      setPendingImage,
      signIn,
      signOut,
      addReceipt,
      updateReceipt,
      removeReceipt,
      addPaymentRequests,
      toggleRequestStatus,
      updatePaymentHandles,
      refreshData: loadData,
    }),
    [user, isLoading, receipts, paymentRequests, paymentHandles, pendingImage, signIn, signOut, addReceipt, updateReceipt, removeReceipt, addPaymentRequests, toggleRequestStatus, updatePaymentHandles, loadData]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}
