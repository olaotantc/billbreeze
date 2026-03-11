# Billbreeze — Snap, Split & Settle the Bill - Cursor IDE Full-Stack Project

## Recommended Project Structure

```
billbreeze/
├── app/                      # Expo Router screens
│   ├── (tabs)/               # Tab navigation
│   ├── (auth)/               # Auth flow screens
│   └── _layout.tsx           # Root layout
├── components/               # Reusable UI components
│   ├── ui/                   # Base components (Button, Input, Card)
│   └── features/             # Feature-specific components
├── services/                 # API clients & business logic
│   ├── api.ts                # HTTP client setup
│   └── auth.ts               # Auth service
├── hooks/                    # Custom React hooks
├── context/                  # React Context providers
├── utils/                    # Helper functions
├── constants/                # App constants & type definitions
```

## Project Overview

Restaurant-bill-splitting is friction-heavy: photographing receipts, manual calculations, and coordinating payments among friends. This product is a mobile MVP that uses an Expo React Native app to capture receipts, run on-device OCR (Google ML Kit), parse totals, compute tax/gratuity-aware splits, and generate per-person Stripe payment links shareable via native share sheet or WhatsApp. Tech approach: Expo for cross-platform UI, Firebase (Auth, Storage, Firestore, Cloud Functions) for serverless backend and token management, Google ML Kit for on-device OCR, Stripe Payment Links for secure settlements — enabling rapid launch and iterative improvement.

## Visual Design System

**Design Intent:** professional secure
**Theme:** Minimalist Secure Flow
**Colors:** background: #F0B429, surface: #F7FBFA, primary: #004E45, accent: #F0B429, text: #08201C, border: #E6F0EE, success: #1F9D74, error: #D6453B
**Typography:** General Sans 600
**Key Dimensions:** 6px radius, 56px nav
**Platform:** Mobile-first — use native touch targets (44px min), bottom navigation, gesture-based interactions
**Component Style:** clean minimal

## Technical Architecture

Tech stack:
- Frontend: Expo-managed React Native app (JavaScript/TypeScript)
- On-device OCR: Google ML Kit via native plugin
- Backend: Firebase Cloud Functions (Node.js) for payment link creation, webhook handlers, and lightweight parsing assistance
- Database: Firebase Firestore for receipts, users, payment-request state
- Storage: Firebase Storage for images and thumbnails
- Payments: Stripe Payment Links / Checkout, webhooks to Cloud Functions
- Notifications: Firebase Cloud Messaging (push)

High-level architecture diagram:
```
Mobile App (Expo) --[image upload / ML Kit OCR on-device]--> OCRService (local)
Mobile App --[receipt metadata, image upload]--> Firebase Storage & Firestore
Cloud Functions --[create payment link + sign token]--> Stripe API
Stripe --[webhook]--> Cloud Functions --> Firestore update --> Mobile App (push)
Share flow: Mobile App --> Native share sheet / WhatsApp URL with individualized Stripe link
```

Operational notes: keep Cloud Functions minimal (token signing, webhook validation), offload heavy parsing to client + lightweight cloud heuristics for ambiguous fields. Rely on Firebase free tiers during MVP.

## Feature Requirements

Must Have:
- Mobile quick-scan camera with edge detection and preprocessing — auto-capture, de-warp, contrast enhancements for consistent images.
- Managed receipt OCR and structured parsing — on-device Google ML Kit OCR with cloud-assisted parse fallback; low-confidence flagging.
- Split calculation engine — equal, itemized, custom percentage, fixed-amount plus tax & tip toggles.
- Secure individualized payment link generation — Stripe Payment Links via Cloud Functions with short-lived tokens and webhook handling.
- Native share sheet integration — prefilled messages and QR generation for one-tap sharing.
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

## Implementation Sequence

Build in this order for best results (small, focused steps):

1. Initialize Expo project with TypeScript template
2. Configure Expo Router for navigation
3. Set up environment variables and constants
4. Implement authentication service and context
5. Create login/signup screens with form validation
6. Add protected route middleware/guards
7. Set up database schema and models
8. Create data access layer (CRUD operations)
9. Implement Mobile quick-scan camera with edge detection and preprocessing
10. Implement Managed receipt OCR and structured parsing
11. Implement Split calculation engine
12. Implement Secure individualized payment link generation
13. Implement Native share sheet integration
14. Implement Firebase Authentication and Storage
15. Implement Quick-edit itemization UI
16. Implement Device contacts integration and push reminders
17. Implement WhatsApp Business Cloud API deep integration
18. Implement CSV/PDF export for business receipts
19. Add loading states, error handling, and edge cases
20. Implement responsive design and accessibility
21. Write tests for critical user flows
22. Performance optimization and final review

## Feature → File Mapping

```
Camera + edge detection        → components/Camera/, services/upload.ts
OCR + structured parsing       → components/managed-receipt-ocr/, services/ocr.ts
Split calculation engine       → components/split-calculation-engine/, services/split.ts
Payment link generation        → services/payment.ts, app/checkout/
Native share sheet             → components/share/, services/share.ts
Firebase Auth + Storage        → services/auth.ts, app/(auth)/
Quick-edit itemization UI      → components/quick-edit/, services/itemization.ts
Contacts + push reminders      → services/notifications.ts, components/Notifications/
WhatsApp integration           → services/whatsapp.ts
CSV/PDF export                 → services/export.ts
```

## External Dependencies

Primary integrations:
- Google ML Kit (On-device Text Recognition): auth: Android/iOS SDK; rate limits: on-device; privacy: runs locally; fallback to cloud OCR TBD
- Stripe (Payment Links / Checkout): auth: API keys in Cloud Functions env; webhooks; rate limits: ~100 req/sec; PCI handled by Stripe
- Firebase (Auth, Storage, Firestore, Cloud Functions): service account; free tier quotas apply
- WhatsApp Business Cloud API (optional): Facebook App / Access Token; template approval required
- Native Share Sheet (iOS/Android): OS-level, no auth
- Expo EAS / App Stores: signing credentials; build quotas apply

Notes on secrets: store Stripe secret and WhatsApp tokens in Firebase Functions environment; generate short-lived per-link tokens (JWT signed) valid for 72 hours.

## Environment Variables

```
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
FIREBASE_API_KEY=
FIREBASE_PROJECT_ID=
JWT_SECRET=
```

## Test Acceptance Criteria

- [ ] Core user flow completes without errors
- [ ] Form validation shows appropriate error messages
- [ ] Loading states display during async operations
- [ ] Error states are handled gracefully
- [ ] Responsive design works on mobile and desktop
