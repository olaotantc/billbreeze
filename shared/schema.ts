import { z } from "zod";

export const lineItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  assignedTo: z.array(z.string()).default([]),
});

export const receiptSchema = z.object({
  id: z.string(),
  merchantName: z.string().default(""),
  date: z.string().default(""),
  imageUri: z.string().optional(),
  lineItems: z.array(lineItemSchema).default([]),
  subtotal: z.number().default(0),
  tax: z.number().default(0),
  tip: z.number().default(0),
  total: z.number().default(0),
  splitMode: z.enum(["equal", "itemized", "fixed"]).default("equal"),
  payers: z.array(z.string()).default([]),
  createdAt: z.string(),
});

export const paymentRequestSchema = z.object({
  id: z.string(),
  receiptId: z.string(),
  payerName: z.string(),
  amount: z.number(),
  status: z.enum(["pending", "paid"]).default("pending"),
  createdAt: z.string(),
});

export const ocrResponseSchema = z.object({
  merchantName: z.string(),
  lineItems: z.array(z.object({
    name: z.string(),
    price: z.number(),
  })),
  subtotal: z.number().optional(),
  tax: z.number().optional(),
  total: z.number().optional(),
});

export type LineItem = z.infer<typeof lineItemSchema>;
export type Receipt = z.infer<typeof receiptSchema>;
export type PaymentRequest = z.infer<typeof paymentRequestSchema>;
export type OCRResponse = z.infer<typeof ocrResponseSchema>;
