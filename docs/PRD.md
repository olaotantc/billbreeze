# Product Requirements Document

## Executive Summary

### Billbreeze — Snap, Split & Settle the Bill

A mobile app that lets friends photograph a restaurant bill (e.g., dinner for four) to split payments.

**Core Mechanics:** Users snap or upload a photo of the bill, tap the number of diners and indicate whether gratuity is included. The app parses totals, calculates each person's share (including tax/gratuity), then generates individualized payment links and offers sharing via WhatsApp, iMessage, or other messaging apps.

**Key Challenges:**

-   Reliable OCR on varied receipts
-   Secure payment link generation and messaging integration

**Similar Products:**

-   **Splitwise** - Expense splitting and IOUs among friends.
-   **Venmo** - Peer-to-peer payments with requests and social sharing.
-   **PayPal.Me** - Simple payment links and broad settlement support.

**Proposed Differentiator:** An end-to-end receipt OCR to individualized payment-link flow with one-tap messaging share, minimizing manual entry and coordination

## Goals & Success Metrics

| KPI | Target (MVP) | Segment | Business Outcome |
|-----|-------------|---------|-----------------|
| OCR total/primary-field accuracy (total, tax, tip) | >= 92% accuracy on tested receipts | All | Reduce manual edits, increase flow completion |
| Time-to-split (camera -> share) | <= 40s median | Frequent Dinner Groups, Students | Fast adoption and repeat usage |
| Payment completion rate (link click -> paid within 48h) | >= 60% | All | Demonstrate monetizable flow |
| Share-to-payment conversion (shares resulting in payment) | >= 35% | Frequent Dinner Groups, Travel | Measure UX effectiveness |
| Crash-free sessions (per release) | >= 99% | All | App stability for early adopters |
| DAU/MAU (30-day retention) | >= 20% | Frequent Dinner Groups | Early engagement signal |
| Support edit frequency (percent of receipts needing manual edits) | <= 30% | All | OCR + parsing quality benchmark |

## Personas & User Stories

| Persona | User Story | Acceptance Criteria |
|---------|-----------|-------------------|
| Frequent Dinner Groups | As a diner I want to snap a single receipt and quickly send each person a payment link so we can settle immediately | Snap image, App parses total & computes shares, Individual links generated & share sheet opens |
| Business Meal Teams | As a colleague I want precise itemized assignment and exportable receipts so finance can reconcile expenses | Line items editable, Items assignable to multiple payers, Export (CSV/PDF) available |
| Budget-Conscious Students | As a student I want a fast, low-friction split that handles tip/tax so I can pay small amounts without hassle | Equal split option available, Tax/gratuity toggles work, Payment link accepts small amounts |
| Travel & Tour Parties | As a traveler I want support for different currencies and one-tap messaging so group payments work across borders | Currency detected/selected, Stripe links include currency, Shareable via WhatsApp/native share sheet |

## UI/UX Specifications

**Hero Section Specifications:**

-   **Container:** full-bleed camera hero; portrait height 48vh; left translucent overlay 36% width for live summary; secure lock badge 28px round anchored top-left of overlay.
-   **CSS (suggested):** background: linear-gradient(180deg, rgba(0,78,69,0.06) 0%, rgba(0,78,69,0.00) 100%); overlay backdrop-filter: blur(8px); hero headline: General Sans 600 22px/30px; CTA: Ghost CTA 44px height, 1px animated border with accent #F0B429; tap ripple/haptic on success.

**Complete Color System:**

-   **Background:** #FFFFFF (WCAG AA for body text on this background)
-   **Surface:** #F7FBFA
-   **Primary:** #004E45 (default); Primary Hover: #003D36; Primary Active: #002A25
-   **Accent:** #F0B429 (hover: #E6A91E; active: #CC8E18)
-   **Text Primary:** #08201C (dark-on-light); Text Secondary: #4B6A65
-   **Border:** #E6F0EE
-   **Success:** #1F9D74; Error: #D6453B
-   **WCAG notes:** Primary text on Background contrast ~ 13:1; Accent on Background contrast ~ 3.6:1 — accent used for emphasis only, not primary text.

**Full Typography Scale:**

-   **Display / Headline:** General Sans 600, 32px /0px, letter-spacing -0.02em
-   **H1:** General Sans 600, 22px / 30px
-   **H2:** General Sans 600, 18px / 26px
-   **H3:** Fraunces 600, 16px / 22px
-   **Body Large:** Fraunces 500, 15px / 22px
-   **Body Regular:** Fraunces 400, 14px / 20px
-   **Caption:** Fraunces 400, 12px / 16px
-   **Notes:** Use Fraunces for readable body, General Sans for UI headings.

**Component Library:**

-   **Buttons:** Height 44px primary ghost; padding 16px horizontal; border-radius 6px; primary has 1px animated border and subtle inset shadow on active; icon placement left 12px; hover translateY(-1px) + shadow increase.
-   **Inputs:** Height 44px, border 1px #E6F0EE, focus ring 2px #004E45 110ms transition, floating label 12px.
-   **Cards:** Radius 6px, padding 12px, surface bg #FFFFFF, hover shadow: 0 6px 18px rgba(2,24,22,0.06).
-   **Avatars/Badges:** 36px avatars; secure token badge 28px round with #004E45 background and white lock icon.
-   **Modals:** Focused edit modal 90% height on mobile, slide-up animation 220ms ease-out; confirm modals require explicit confirm/cancel.

**Layout System:**

-   Mobile-first single column; container max-width 720px; spacing scale 4/8/12/16/24/32; persistent bottom nav 56px.
-   **Grid:** 12-column responsive for tablet/desktop; camera sheet: portrait 48vh, landscape camera sheet 65vh.
-   **Breakpoints:** mobile <= 480px; tablet 481-1024px; desktop >1024px.

**Interaction Patterns:**

-   Default animation timing 200-300ms ease-out; tap settle 110ms. Border-animate on focus with 110ms easing. Haptic on success events (payment completed, link generated). Confirm modal for link generation. Loading skeletons for OCR parse (animated shimmer 800ms loop). Error toast with actionable retry.

**Application Structure:**

**Screen Breakdown:**

-   Onboarding/Welcome
-   Sign In / Authentication
-   Home / Dashboard (Recent receipts, quick-scan CTA)
-   Camera / Quick-Scan View (auto-capture, edge detect)
-   Receipt Edit / Itemization Modal
-   Split Configuration (selectors: equal, itemized, percentage, fixed)
-   Payer Assignment Screen (contacts + manual entry)
-   Payment Link Generation & Share Sheet
-   Payments Inbox (requests status: pending/paid/failed)
-   Settings (profile, payment connector, export)
-   Debug / OCR review screen (for support)

**Page Layouts:**

*Home / Dashboard:* top nav with profile; hero camera CTA full-bleed; Recent receipts list; quick actions (scan, import image, create manual split).

*Camera / Quick-Scan:* camera preview full-bleed; left translucent summary overlay 36%; auto-capture toggle; manual capture button; flash/HDR control; edge-detect overlay.

*Receipt Edit:* header with merchant/date/total; line-item list (editable rows); assign button on each line; merge/split actions; subtotal/tax/tip summary; split rules toggle.

*Split Configuration:* split mode selector; include/exclude tax & tip toggles; preview per-person amounts; generate links CTA.

*Share:* prefilled message composer + native share sheet/WhatsApp button + QR code option.

**Component Hierarchy:**

```
App
  Navigation
    BottomNav
    TopBar
  Screens
    Home
      HeroCameraCTA
      RecentReceiptsList
    CameraView
      EdgeDetectionOverlay
      AutoCaptureController
    ReceiptEdit
      LineItemList
        LineItemRow
        EditText
        AssignButton
    SplitConfig
      SplitModeSelector
      TaxTipToggles
      PerPersonPreview
    ShareView
      PaymentLinkList
      ShareButtons
  Services
    OCRService (ML Kit wrapper)
    StorageService (Firebase Storage)
    PaymentService (Stripe)
    AuthService (Firebase Auth)
```

**User Flows:**

*New User Quick-Scan Flow:* Onboarding → Sign In (phone/email) → Home → Camera → Auto-capture → OCR parse → Receipt Edit (if low-confidence) → Split Config → Generate links → Share → Payment Inbox tracks statuses.

*Itemized Split Flow:* Camera → OCR parse → Receipt Edit → Assign items to payers → Split Config (include tax/tip) → Generate links → Share.

*Payment Resolution Flow:* Payment link clicked → Stripe checkout → Firestore update → Push notification to requester and payer.

## Feature Requirements

**Must Have:**

-   Mobile quick-scan camera with edge detection and preprocessing — auto-capture, de-warp, contrast enhancements for consistent images.
-   Managed receipt OCR and structured parsing — on-device Google ML Kit OCR with cloud-assisted parse fallback; low-confidence flagging.
-   Split calculation engine — equal, itemized, custom percentage, fixed-amount plus tax & tip toggles.
-   Secure individualized payment link generation — Stripe Payment Links via Cloud Functions with short-lived tokens and webhook handling.
-   Native share sheet integration — prefilled messages and QR generation for one-tap sharing.
-   Firebase Authentication and Storage — user sessions, receipt image storage, and Firestore for receipt/requests state.

**Should Have:**

-   Quick-edit itemization UI — touch-first editor for corrections, assign items to multiple diners, merge/split lines.
-   Device contacts integration and push reminders — optionally prefill payers and send reminders for unpaid links (SMS via Twilio optional).

**Could Have:**

-   WhatsApp Business Cloud API deep integration — preformatted template messages (depends on business account approval).
-   CSV/PDF export for business receipts — for expense reporting.

**Won't Have (MVP):**

-   Multi-party escrow or in-app settlement wallet.
-   Advanced fraud detection and chargeback automation.
-   Full enterprise admin console.

## External Dependencies & Integrations

**Primary integrations:**

-   **Google ML Kit (On-device Text Recognition):** auth: Android/iOS SDK; rate limits: on-device, no server rate limits; privacy: runs locally; fallback to cloud OCR TBD; notes: requires native plugin configuration in Expo (eas config plugin).
-   **Stripe (Payment Links / Checkout):** auth: API keys (secret in Cloud Functions env); webhooks for payment events; rate limits: typical API limit ~100 req/sec (varies by account); costs: per-transaction fees (Stripe standard); compliance: PCI handled by Stripe.
-   **Firebase (Auth, Storage, Firestore, Cloud Functions):** auth: service account for Cloud Functions; rate limits: free tier quotas apply (Firestore reads/writes billing); Storage rules for secure image access; costs scale with usage.
-   **WhatsApp Business Cloud API (optional):** auth: Facebook App / Access Token; rate limits: per-app messaging limits and template approval required; costs vary by region and provider.
-   **Native Share Sheet (iOS/Android):** uses OS share — no auth; for WhatsApp deep linking use URL scheme; ensure link preview content length minimized.
-   **Expo EAS / App Stores:** credentials for signing; build quotas apply.

Notes on secrets & tokens: store Stripe secret and WhatsApp tokens in Firebase Functions environment; generate short-lived per-link tokens (JWT signed) valid for 72 hours or configurable.

## Technical Architecture

**Tech stack:**

-   **Frontend:** Expo-managed React Native app (JavaScript/TypeScript)
-   **On-device OCR:** Google ML Kit via native plugin
-   **Backend:** Firebase Cloud Functions (Node.js) for payment link creation, webhook handlers, and lightweight parsing assistance
-   **Database:** Firebase Firestore for receipts, users, payment-request state
-   **Storage:** Firebase Storage for images and thumbnails
-   **Payments:** Stripe Payment Links / Checkout, webhooks to Cloud Functions
-   **Notifications:** Firebase Cloud Messaging (push)

**High-level architecture diagram (text):**

```
Mobile App (Expo) --[image upload / ML Kit OCR on-device]--> OCRService (local)
Mobile App --[receipt metadata, image upload]--> Firebase Storage & Firestore
Cloud Functions --[create payment link + sign token]--> Stripe API
Stripe --[webhook]--> Cloud Functions --> Firestore update --> Mobile App (push)
Share flow: Mobile App --> Native share sheet / WhatsApp URL with individualized Stripe link
```

**Operational notes:** keep Cloud Functions minimal (token signing, webhook validation), offload heavy parsing to client + lightweight cloud heuristics for ambiguous fields. Rely on Firebase free tiers during MVP.

## Design Requirements

### Minimalist Secure Flow

**Hero** Full-bleed camera with left 36% translucent overlay for summary and secure lock badge; hero height 48vh on portrait

**Layout** Single-column clean flow; persistent bottom nav 56px with quick-undo; landscape: camera sheet 65vh; focused edit modal 90% height

**Colors** Bg:#FFFFFF • Primary:#004E45 • Accent:#F0B429 • Surface:#F7FBFA

**Typography** General Sans 600 22px/30px H1 • Fraunces 500 15px/22px body

**Components** Ghost CTAs with 1px animated border; Sharp corner cards 6px radius; Compact 44px touch controls; Secure token badge 28px round

**Interactions** Tap:110ms settle; Border-animate on focus; Confirm modal for link generation; Haptic success on paid

### Design Specifications

-   **Mood & Tone:** professional secure
-   **Component Style:** clean minimal

## Effort & Story-Point Estimates

**Story points (Fibonacci):**

-   **Core infra & auth (Firebase Auth, Storage, Firestore, initial Cloud Functions):** 8
-   **Camera + edge detection + pre-processing UI:** 5
-   **ML Kit on-device OCR integration & baseline parsing:** 8
-   Parse confidence handling + UI to flag edits: 3
-   **Receipt edit UI (line item edit, merge/split, assign):** 8
-   **Split calculation engine (modes + tax/tip toggles):** 5
-   **Stripe Payment Link integration + webhook handling:** 5
-   Share/QR + native share sheet integration: 3
-   **Push notifications + reminders:** 3
-   **Testing, QA, small performance fixes & polish:** 5
-   **Release & App Store submission:** 3

**Total:** 56 story points (MVP-focused).

## Timeline & Milestones

**Sprint-based accelerated timeline (3 sprints over 3 weeks)**

Sprint 1 (Week 1) — Foundations & Camera
-   **Deliverables:** Project setup, Firebase project + rules, Expo skeleton app, Authentication flows (email/phone), Camera screen with edge detection and auto-capture; Firebase Storage upload pipeline.
-   **Acceptance:** Sign-in + camera capture + image stored in Storage; basic UI flows wired.

Sprint 2 (Week 2) — OCR parsing & Editing
-   **Deliverables:** ML Kit on-device OCR integration; initial parsing pipeline (merchant/date/total/tax tip extraction); Receipt Edit modal for low-confidence corrections; Firestore schema for receipts.
-   **Acceptance:** OCR extracts key fields on test set >= 85% for totals; user can edit line items and save to Firestore.

Sprint 3 (Week 3) — Splits, Payments & Sharing
-   **Deliverables:** Split engine (equal/itemized/custom), Stripe Payment Links integration via Cloud Functions, share sheet + QR generation, webhook handling for payment updates, basic Payments Inbox, final QA & app store build.
-   **Acceptance:** Per-person links generated and can be shared; Stripe webhooks update request status; end-to-end test payment flow validated in sandbox.

**Notes:** Post-launch quick iterations planned for OCR edge cases and message template improvements. Timeline assumes a small team (1-2 engineers + 1 designer) and relies on managed services; extend by 1-2 weeks if WhatsApp Business API integration is required (approval latency).

## Definition of Done

-   End-to-end flow validated in staging: Capture -> OCR -> Edit -> Split -> Generate Stripe link -> Share -> Simulate payment -> Webhook updates Firestore; test coverage: critical flows have automated smoke tests.
-   **OCR accuracy:** totals extracted correctly in >=92% of a 100-receipt staged test set (MVP target); receipts failing parse present editable UI.
-   **Security:** Stripe secret keys not shipped to client; Cloud Functions verify and sign tokens; Firebase rules prevent unauthorized access to receipts.
-   **Performance:** Median time from capture to split preview <= 40s on modern mid-range devices.
-   **UX:** Share sheet opens with prefilled message and individualized links; QR generation available.
-   **App stability:** Crash-free sessions >=99% during QA session.
-   **Analytics:** Basic events tracked (scan_start, scan_complete, parse_confidence_low, link_generated, link_paid) and visible in a dashboard.
-   **Documentation:** README with setup steps, env variables, Cloud Function deploy instructions, and runbook for webhook issues.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| OCR fails on noisy/foreign receipts | M | H | Preprocess (dewarp/contrast), flag low-confidence, provide manual edit path, collect training samples |
| Stripe integration edge cases (currency, small amounts) | M | M | Validate currency detection, test with Stripe sandbox, fail-safe messaging |
| WhatsApp Business API approval delays | H | M | Use native share sheet as primary, treat WhatsApp as deferred, build generic fallback |
| Expo/native plugin complexity for ML Kit | M | M | Use EAS build/native config plugin, allocate native build debugging time, server-side OCR fallback |
| Privacy & data retention concerns | M | H | Clear opt-in for contacts, minimal PII, encrypted storage rules, retention policy, delete on request |
| Webhook security / spoofing | L | H | Validate webhook signatures, secret verification, log events and retry logic |
| Insufficient user adoption / low payment completion | M | M | Optimize message copy, reduce friction, add reminders, run small pilot |

## Appendices

-   **References:**
    -   Google ML Kit Text Recognition: https://developers.google.com/ml-kit/vision/text-recognition
    -   Firebase (Auth, Firestore, Storage, Functions): https://firebase.google.com/docs
    -   Stripe Payment Links & Webhooks: https://stripe.com/docs/payments/payment-links
    -   Expo & EAS build docs: https://docs.expo.dev/eas/
-   **Firestore schema (brief):** receipts/{receiptId} { merchant, date, total, currency, items[], parsedConfidence, ownerUid, createdAt }
-   **Cloud Functions endpoints (examples):**
    -   POST /createPaymentLinks {receiptId, splitConfig} -> creates per-person Stripe links (signed token)
    -   POST /webhook/stripe -> handles payment events
-   **Glossary:**
    -   **Parsed Confidence:** numeric score (0-1) aggregated from OCR and parse heuristics.
    -   **Split Request:** per-person object with amount, currency, linkUrl, status (pending/paid/failed).
