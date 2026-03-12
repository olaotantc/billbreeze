# BillBreeze Cutting Plan — Ship Fast, Iterate Smart

## Philosophy
Ship the working prototype to the App Store now. Kill the server next. Add PRD features only when user feedback demands them.

---

## Phase 1 — Ship What Exists (3-5 days)

### 1.1 Remove Dead Dependencies
- **Delete files:** `drizzle.config.ts`, `server/storage.ts` (imports nonexistent types)
- **Remove from package.json:** `drizzle-orm`, `drizzle-zod`, `pg` (runtime); `drizzle-kit` (devDep)
- **Remove scripts:** `db:push`

### 1.2 Create EAS Configuration
- **Create `eas.json`** with development/preview/production profiles
- **Create `.easignore`** excluding `server/`, `landing/`, `tests/`, `scripts/`, `migrations/`, `attached_assets/`, `patches/`

### 1.3 Fix app.json for iOS Submission
- Add `expo.ios.buildNumber: "1"`
- Add `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` in `infoPlist`
- Remove Replit-specific `expo-router` origin (`"origin": "https://replit.com/"`)
- Add `usesNonExemptEncryption: false`
- Add `expo-camera` to plugins array (currently missing — camera permissions won't work on production builds without it)

### 1.4 Configure Production API URL
**Critical:** The app currently resolves the server via `Constants.expoConfig.hostUri` (Expo dev server) or falls back to `localhost:8080`. Neither works on a production build.

**Decision needed:** Deploy Express server somewhere (Railway/Render, ~$5-7/mo) OR jump to Phase 2 first (on-device OCR, no server needed).

If deploying: set `EXPO_PUBLIC_API_URL` as an EAS environment variable.

### 1.5 Privacy Policy
- Host a simple privacy policy (GitHub Pages or in-app screen)
- Must disclose: camera/photo usage, local-only storage, Google Vision API data transmission, no tracking
- Wire up the "Privacy" row in `app/(tabs)/settings.tsx` (currently says "Coming soon")

### 1.6 Verify Assets
- Confirm `assets/images/icon.png` is 1024x1024 (Apple requirement)
- Splash screen already configured with #004E45 background

### 1.7 App Store Screenshots
- Capture on iPhone 6.7" (required) and 6.1" (required)
- Key screens: Welcome, Camera, Receipt Review, Split Config, Payment Summary

### 1.8 App Store Metadata
- **Name:** BillBreeze
- **Subtitle:** Snap, Split & Settle Bills
- **Category:** Finance
- **Keywords:** bill split, receipt scanner, split check, dinner split, OCR receipt
- **Privacy policy URL:** (from 1.5)
- **Support URL:** needed

### 1.9 Build & Submit
```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile preview  # test first
# → TestFlight testing with 2-3 people
eas build --platform ios --profile production
eas submit --platform ios
```

### 1.10 Testing Checklist
- [ ] Full equal split flow: Welcome → Sign in → Camera → Scan → Review → Split → Summary → Share
- [ ] Full itemized flow with payer assignment
- [ ] Gallery import (not just camera)
- [ ] Edit receipt from home screen
- [ ] Toggle pending/paid in inbox
- [ ] Payment handles save/reload in settings
- [ ] Camera permission denied → gallery fallback
- [ ] OCR failure → manual "add items" flow
- [ ] No network → timeout + error message
- [ ] Delete receipt
- [ ] Sign out + sign back in

---

## Phase 2 — Kill the Server (1-2 weeks)

### 2.1 On-Device OCR
**Goal:** Eliminate Express server and Vision API costs entirely.

**Recommended:** `react-native-mlkit-ocr` (Google ML Kit, runs on-device, free, no API key)

**Steps:**
1. Add `react-native-mlkit-ocr` dependency
2. Extract `parseReceiptText` from `server/routes.ts` → new file `lib/ocr-parser.ts` (it's pure JS, no server deps)
3. Update `app/receipt-review.tsx`: replace server `fetch` with on-device ML Kit call + local parser
4. Update import in `tests/parser.test.ts` to point to `lib/ocr-parser.ts` — all 52 tests must pass
5. Remove `lib/query-client.ts` server functions (`getApiUrl`, `apiRequest`)

**Delete entire server:**
- `server/index.ts`, `server/routes.ts`, `server/templates/`

**Remove deps:** `express`, `express-rate-limit`, `helmet`, `http-proxy-middleware`, `ws`, `@types/express`

**Remove scripts:** `server:dev`, `server:build`, `server:prod`, `expo:dev`

**Result:** Zero-infrastructure app. No server costs. No API key needed.

### 2.2 Loading Skeletons
- Create `components/Skeleton.tsx` (reusable shimmer component)
- Add to receipt-review (during OCR processing) and home screen (during AsyncStorage load)

### 2.3 Basic Analytics
- Add PostHog React Native SDK or expo-analytics
- Track: `receipt_scanned`, `split_mode_selected`, `payment_shared`, `payment_saved`

---

## Phase 3 — PRD Parity (2-3 weeks, only if user feedback demands it)

### 3.1 Stripe Payment Links
- Add `@stripe/stripe-react-native`
- Create payment links via Stripe API per payer
- Supplement existing Venmo/PayPal/CashApp URL schemes
- Requires a backend (Cloud Function or edge function) for Stripe secret key

### 3.2 Firebase Auth + Firestore
- Replace AsyncStorage with Firestore for cross-device sync
- Firebase Auth with Apple Sign-In (required by App Store if offering social auth)
- `@react-native-firebase/app`, `/auth`, `/firestore`

### 3.3 Camera Edge Detection
- `react-native-document-scanner-plugin` or custom Vision framework
- Auto-capture when edges detected

### 3.4 Push Notifications
- `expo-notifications` + backend trigger
- Notify on payment status changes

### 3.5 QR Code Generation
- `react-native-qrcode-svg`
- Display on payment summary as alternative to text sharing

### 3.6 Additional Split Modes
- Custom percentage split
- Fixed-amount split
- (Currently only equal + itemized exist)

---

## Decisions Needed Before Starting

| # | Decision | Options | Impact |
|---|----------|---------|--------|
| 1 | Apple Developer Program | Do you have an active $99/year membership? | Hard blocker for App Store |
| 2 | Phase 1 server hosting vs Phase 2 first | Deploy Express ($5-7/mo) OR skip to on-device OCR | Determines if Phase 1 needs a server |
| 3 | Bundle identifier | `com.billbreeze` is set — confirm it's what you want | Must be unique on App Store |
| 4 | Privacy policy hosting | GitHub Pages / Vercel / in-app screen | Needed for submission |
| 5 | Screenshots | Raw device captures or designed frames? | Affects timeline |

---

## Cost Summary By Phase

| Phase | Monthly Cost | One-Time Cost |
|-------|-------------|---------------|
| Phase 1 (with server) | ~$5-7/mo (hosting) + ~$1.50/1K scans (Vision API) | $99 Apple Developer |
| Phase 2 (no server) | $0 | — |
| Phase 3 (with Stripe) | Stripe fees per transaction | Firebase free tier |
