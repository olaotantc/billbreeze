# BillBreeze — Roadmap

**Created**: 2026-03-12
**Last Updated**: 2026-03-12

---

## Current State

App is fully functional on-device. All data stored in AsyncStorage. No backend. Ready for TestFlight but not for real users yet — data loss on uninstall is the critical gap.

---

## Phase A: TestFlight + Firebase (This Week)

### A.1 — Apple Developer Enrollment
- Re-enroll at developer.apple.com ($99/year)
- Get appleId, ascAppId, appleTeamId for `eas.json`
- Enable "Sign in with Apple" capability in the Developer portal

### A.2 — TestFlight Build (Current Code)
- Fill `eas.json` submit credentials
- `eas build --platform ios --profile preview`
- Install on device via TestFlight
- Test core flow: scan, split, share
- Capture App Store screenshots (6.7" + 6.1") using seed data
- Remove seed data from `lib/app-context.tsx` after capturing

### A.3 — Firebase Integration (Parallel with A.2)
**Goal**: Real auth + cloud persistence so data survives uninstall.

#### Setup
- Create Firebase project ("BillBreeze") in Firebase Console
- Enable Auth providers: Apple Sign-In + Email/Password
- Create Firestore database (production mode)
- Download `GoogleService-Info.plist` (iOS) + `google-services.json` (Android)

#### Dependencies
```
npm install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore expo-apple-authentication expo-build-properties
```

#### New Files
| File | Purpose |
|------|---------|
| `lib/firebase/config.ts` | Firebase init, Firestore offline persistence settings |
| `lib/firebase/auth.ts` | Auth wrappers: email/password, Apple Sign-In, sign out |
| `lib/firebase/firestore.ts` | Firestore CRUD mirroring current `lib/storage.ts` interface |
| `lib/firebase/migration.ts` | One-time AsyncStorage to Firestore data migration |
| `lib/firebase/index.ts` | Barrel export |

#### Firestore Schema
```
users/{uid}/
  profile: { email, name, paymentHandles }

users/{uid}/receipts/{receiptId}/
  merchantName, date, currency, lineItems[], subtotal, tax, tip, total, ...

users/{uid}/paymentRequests/{requestId}/
  receiptId, payerName, amount, currency, status, createdAt
```

#### Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /receipts/{receiptId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /paymentRequests/{requestId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

#### Modified Files
| File | Changes |
|------|---------|
| `app.json` | Add Firebase plugins, googleServicesFile paths, usesAppleSignIn |
| `lib/app-context.tsx` | Replace AsyncStorage with Firebase Auth listener + Firestore ops |
| `app/sign-in.tsx` | Apple Sign-In button, email/password (not email/name), create account mode |
| `lib/storage.ts` | Keep read-only for migration, no new writes |
| `.gitignore` | Add GoogleService-Info.plist, google-services.json |

#### Implementation Order
1. Firebase Console setup (create project, enable providers, download configs)
2. Install dependencies
3. Configure `app.json` (plugins, google services, Apple Sign-In)
4. Create `lib/firebase/` module (config, auth, firestore, migration)
5. Update `lib/app-context.tsx` (Firebase Auth + Firestore)
6. Update `app/sign-in.tsx` (new auth UI)
7. Deploy Firestore security rules
8. Test with development build (`npx expo run:ios` — Expo Go won't work with native Firebase)
9. Test migration (local data -> Firestore)
10. Remove seed data block from app-context.tsx

#### Key Considerations
- `expo-build-properties` with `useFrameworks: "static"` required for iOS Firebase
- Apple Sign-In doesn't work on simulator — test on real device
- Firestore offline persistence is enabled by default (app works offline, syncs when online)
- Firebase Spark (free) plan: 50K auth, 1GB Firestore, 50K reads/day — plenty for launch
- Migration uses Firestore batched writes (500 op limit per batch, unlikely to hit for bill splitting data)

### A.4 — App Store Submission
- Set `APP_STORE_ID` in `constants/app.ts`
- Final TestFlight test with Firebase
- App Store copy from `cowork/deliverables/app-store-copy.md`
- Submit via `eas submit --platform ios`

---

## Phase B: Launch & Early Traction (First 30 Days Post-Launch)

### B.1 — Viral Loop (Already Built)
- Share messages include BillBreeze branding + App Store link
- Every split = 3-5 people see the app

### B.2 — Community Seeding
- Post in r/splitwise, r/personalfinance, r/apps when Splitwise complaint threads appear
- Cross-post to Build in Public, Vibe Coding communities on X
- "BillBreeze vs Splitwise" comparison post for landing page blog

### B.3 — Landing Page
- Deploy `landing/index.html` to billbreeze.co (or similar)
- Splitwise Alternative SEO section already added
- Add App Store download badge once live

### B.4 — Analytics Review
- Monitor local analytics counters (receipt_scanned, split_completed, payment_request_sent, payment_marked_paid)
- Identify which features users engage with most
- Decide which Pro features to build first

---

## Phase C: Monetization (60-90 Days Post-Launch)

### C.1 — Pro Unlock ($2.99 One-Time)
- Add `pro` boolean to user context
- Gate receipt history beyond 10 items
- StoreKit 2 integration for iOS in-app purchase (non-consumable)

### C.2 — Pro Features
- Group presets (save "Friday dinner crew" with names + payment handles)
- CSV export for payment request history
- Custom split ratios (percentage-based)
- Custom tip calculator

### C.3 — Priority Based on User Data
- Only build what users actually want
- Monitor analytics + App Store reviews
- Consider push notification reminders for unpaid requests (free tier, drives engagement)

---

## Phase D: PRD Parity (If Demand Warrants)

| Feature | Trigger |
|---------|---------|
| Stripe Payment Links | Users request in-app payments (requires Cloud Functions) |
| Camera edge detection | OCR accuracy complaints from poor-quality photos |
| Push notifications | Users want payment reminders |
| QR code generation | Users want alternative to text sharing |
| Multi-device sync | Already solved by Firebase in Phase A |

---

## Cost Projections

| Phase | Monthly | One-Time |
|-------|---------|----------|
| A (Firebase Spark) | $0 | $99 Apple Developer |
| B (Launch) | $0 | Domain ~$12/year |
| C (With Stripe) | Stripe fees per txn | $0 |
| Scale (Firebase Blaze) | Pay-as-you-go if >50K users | $0 |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-11 | Ship without server (Phase 1+2 merged) | Zero infrastructure cost, faster to App Store |
| 2026-03-12 | Add Firebase before marketing (not before submission) | Data loss on uninstall will generate 1-star reviews |
| 2026-03-12 | One-time $2.99 Pro, not subscription | Anti-Splitwise positioning; subscription fatigue |
| 2026-03-12 | Target frustrated Splitwise users first | High-intent audience, clear differentiator |
