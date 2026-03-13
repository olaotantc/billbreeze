# Billbreeze — Snap, Split & Settle the Bill - Cloud Deployment with Replit

## Project Overview

Restaurant-bill-splitting is friction-heavy: photographing receipts, manual calculations, and coordinating payments among friends. This product is a mobile MVP that uses an Expo React Native app to capture receipts, run on-device OCR (Google ML Kit), parse totals, compute tax/gratuity-aware splits, and generate per-person Stripe payment links shareable via native share sheet or WhatsApp. Tech approach: Expo for cross-platform UI, Firebase (Auth, Storage, Firestore, Cloud Functions) for serverless backend and token management, Google ML Kit for on-device OCR, Stripe Payment Links for secure settlements — enabling rapid launch and iterative improvement.

## Cloud Architecture

Tech stack:
- Frontend: Expo-managed React Native app (JavaScript/TypeScript)
- On-device OCR: Google ML Kit via native plugin
- Backend: Firebase Cloud Functions (Node.js) for payment link creation, webhook handlers, weight parsing assistance
- Database: Firebase Firestore for receipts, users, payment-request state
- Storage: Firebase Storage for images and thumbnails
- Payments: Stripe Payment Links / Checkout, webhooks to Cloud Functions
- Notifications: Firebase Cloud Messaging (push)

High-level architecture diagram (text):
```
Mobile App (Expo) --[image upload / ML Kit OCR on-device]--> OCRService (local)
Mobile App --[receipt metadata, image upload]--> Firebase Storage & Firestore
Cloud Functions --[create payment link + sign token]--> Stripe API
Stripe --[webhook]--> Cloud Functions --> Firestore update --> Mobile App (push)
Share flow: Mobile App --> Native share sheet / WhatsApp URL with individualized Stripe link
```

Operational notes: keep Cloud Functions minimal (token signing, webhook validation), offload heavy parsing to client + lightweight cloud heuristics for ambiguous fields. Rely on Firebase free tiers during MVP.

## Visual Design System

**Design Intent:** professional secure
**Theme:** Minimalist Secure Flow
**Colors:** background: #F0B429, surface: #F7FBFA, primary: #004E45, accent: #F0B429, text: #08201C, border: #E6F0EE, success: #1F9D74, error: #D6453B
**Typography:** General Sans 600
**Key Dimensions:** 6px radius, 56px nav
**Platform:** Mobile-first — use native touch targets (44px min), bottom navigation, gesture-based interactions
**Component Style:** clean minimal

## Screens

- Onboarding/Welcome
- Sign In / Authentication
- Home / Dashboard (Recent receipts, quick-scan CTA)
- Camera / Quick-Scan View (auto-capture, edge detect)
- Receipt Edit / Itemization Modal
- Split Configuration (selectors: equal, itemized, percentage, fixed)
- Payer Assignment Screen (contacts + manual entry)
- Payment Link Generation & Share Sheet
- Payments Inbox (requests status: pending/paid/failed)
- Settings (profile, payment connector, export)
- Debug / OCR review screen (for support)

## User Flows

- New User Quick-Scan Flow: Onboarding → Sign In (phone/email) → Home → Camera → Auto OCR parse → Receipt Edit (if low-confidence) → Split Config → Generate links → Share → Payment Inbox tracks statuses.
- Itemized Split Flow: Camera → OCR parse → Receipt Edit → Assign items to payers → Split Config (include tax/tip) → Generate links → Share.
- Payment Resolution Flow: Payment link clicked → Stripe checkout → Webhook to Cloud Function → Firestore update → Push notification to requester and payer.

## Features to Build

Must Have:
- Mobile quick-scan camera with edge detection and preprocessing — auto-capture, de-warp, contrast enhancements for consistent images.
- Managed receipt OCR and structured parsing — on-device Google ML Kit OCR with cloud-assisted parse fallback; low-confidence flagging.
- Split calculation engine — equal, itemized, custom percentage, fixed-amount plus tax & tip toggles.
- Secure individualized payment link generation — Stripe Payment Links via Cloud Functions with short-lived tokens and webhook handling.
- Native share sheet + QR generation for one-tap sharing.
- Firebase Authentication and Storage — user sessions, receipt image storage, and Firestore for receipt/requests state.

Should Have:
- Quick-edit itemization UI — touch-first editor for corrections, assign items to multiple diners, merge/split lines.
- Device contacts integration and push reminders — optionally prefill payers and send reminders for unpaid links (SMS via Twilio optional).

Could Have:
- WhatsApp Business Cloud API deep integration — preformatted template messages (depends on business account approval).
- CSV/PDF export for business receipts — for expense reporting.

Won't Have (MVP):
- Multi-party escrow or in-app settlement wallet.
- Advanced fraud detection and chargeback automation.
- Full enterprise admin console.

## Integrations & APIs

Primary integrations:
- Google ML Kit (On-device Text Recognition): auth: Android/iOS SDK; rate limits: on-device, no server rate limits; privacy: runs locally; fallback to cloud OCR TBD; notes: requires native plugin configuration in Expo (eas config plugin).
- Stripe (Payment Links / Checkout): auth: API keys (secret in Cloud Functions env); webhooks for payment events; rate limits: typical API limit ~100 req/sec (varies by account); costs: per-transaction fees (Stripe standard); compliance: PCI handled by Stripe.
- Firebase (Auth, Storage, Firestore, Cloud Functions): auth: service account for Cloud Functions; rate limits: free tier quotas apply (Firestore reads/writes billing); Storage rules for secure image access; costs scale with usage.
- WhatsApp Business Cloud API (optional): auth: Facebook App / Access Token; rate limits: per-app messaging limits and template approval required; costs vary by region and provider.
- Native Share Sheet (iOS/Android): uses OS share — no auth; for WhatsApp deep linking use URL scheme; ensure link preview content length minimized.
- Expo EAS / App Stores: credentials for signing; build quotas apply.

Notes on secrets & tokens: store Stripe secret and WhatsApp tokens in Firebase Functions environment; generate short-lived per-link tokens (JWT signed) valid for 72 hours or configurable.

## Build Sequence

**Phase 1 — Foundation:** Authentication setup, Database schema & connection, Payment integration scaffold
**Phase 2 — Core:** Mobile quick-scan camera with edge detection and preprocessing, Managed receipt OCR and structured parsing, Split calculation engine, Secure individualized payment link generation, Native share sheet integration, Firebase Authentication and Storage
**Phase 3 — Supporting:** Quick-edit itemization UI, Device contacts integration and push reminders
**Phase 4 — Polish:** WhatsApp Business Cloud API deep integration, CSV/PDF export for business receipts
**Defer to v2:** Multi-party escrow or in-app settlement wallet, Advanced fraud detection and chargeback automation, Full enterprise admin console.

## Environment Variables

```
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
FIREBASE_API_KEY=
FIREBASE_PROJECT_ID=
JWT_SECRET=
```
