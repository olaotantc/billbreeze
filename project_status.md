# BillBreeze - Project Status

**Last Updated**: 2026-03-25
**Platform**: Expo 54 / React Native 0.81 (serverless)
**Stage**: App Store Ready (pending Apple Developer enrollment)
**Repo**: https://github.com/olaotantc/billbreeze
**Landing Page**: https://billbreeze.co (Vercel, auto-deploys from main)

---

## Feature Status

### Core Features (Complete)
| Feature | Status | File(s) |
|---------|--------|---------|
| Receipt scanning (camera) | Done | `app/camera.tsx` |
| Receipt scanning (gallery import) | Done | `app/(tabs)/index.tsx` |
| JPEG conversion (HEIC fix) | Done | `app/camera.tsx` |
| On-device OCR (ML Kit) | Done | `app/receipt-review.tsx`, `lib/ocr-parser.ts` |
| Receipt text parser | Done | `lib/ocr-parser.ts` (53 tests, 48 passing, 5 known edge-case failures) |
| Manual item editing | Done | `app/receipt-review.tsx` |
| Equal bill split | Done | `app/split-config.tsx`, `app/payment-summary.tsx` |
| Itemized bill split | Done | `app/payer-assignment.tsx`, `app/payment-summary.tsx` |
| Proportional tax/tip distribution | Done | `app/payment-summary.tsx`, `app/payer-assignment.tsx` |
| Payment link generation (Venmo, PayPal, Cash App) | Done | `app/payment-summary.tsx` |
| Share breakdown via messaging | Done | `app/payment-summary.tsx` |
| BillBreeze branding in share text | Done | `constants/app.ts` (SHARE_FOOTER) |
| Payment request tracking (inbox) | Done | `app/(tabs)/inbox.tsx` |
| Pending/paid status toggle | Done | `app/(tabs)/inbox.tsx` |
| Settings (payment handles) | Done | `app/(tabs)/settings.tsx` |
| Sign-out with auth guard redirect | Done | `app/(tabs)/_layout.tsx`, `app/(tabs)/settings.tsx` |
| Local data persistence | Done | `lib/storage.ts`, `lib/app-context.tsx` |
| Error boundaries | Done | `components/ErrorBoundary.tsx` |
| Currency detection (OCR) | Done | `lib/ocr-parser.ts` |
| Quantity parsing (OCR) | Done | `lib/ocr-parser.ts` |
| Privacy policy (in-app) | Done | `app/privacy.tsx` |
| Local analytics counters | Done | `lib/analytics.ts` (4 events) |
| EAS Build configuration | Done | `eas.json`, `.easignore` |
| iOS permissions & metadata | Done | `app.json` |

### App Store Readiness
| Item | Status | Notes |
|------|--------|-------|
| App icon (1024x1024) | Done | `assets/images/icon.png` |
| Splash screen | Done | `assets/images/splash-icon.png` |
| iOS camera permission string | Done | `app.json` infoPlist |
| iOS photo library permission | Done | `app.json` infoPlist |
| Encryption exemption | Done | `usesNonExemptEncryption: false` |
| EAS build profiles | Done | `eas.json` (dev/preview/production) |
| Privacy policy | Done | In-app at `app/privacy.tsx` |
| Settings links wired | Done | About, Privacy, Help & Support |
| Landing page | Done | billbreeze.co (Vercel) |
| Apple Developer Account | **BLOCKED** | Needs re-enrollment ($99/year) |
| App Store screenshots | Not done | Need 6.7" + 6.1" captures |
| TestFlight testing | Not done | Requires Apple Developer |
| App Store submission | Not done | Requires Apple Developer |

### Partially Implemented
| Feature | Status | Notes |
|---------|--------|-------|
| Fixed split mode | Schema only | Defined in `shared/schema.ts` but no UI |
| Receipt image storage | Schema only | `imageUri` field exists but never populated |
| Receipt date tracking | Schema only | `date` field exists but never set from OCR |

### Not Started (Future Phases)
| Feature | Phase | Description |
|---------|-------|-------------|
| Firebase Auth + Firestore | A | Cloud persistence, real auth, Apple Sign-In |
| Stripe Payment Links | D | Per-person Stripe links (requires Cloud Functions) |
| Camera edge detection | D | Auto-capture with document detection |
| Push notifications | D | Payment status reminders |
| QR code generation | D | Alternative to text sharing |
| Pro unlock ($2.99 one-time) | C | Gate receipt history beyond 10 items |
| Group presets | C | Save recurring payer groups |
| CSV export | C | Payment request history export |
| Custom split ratios | C | Percentage-based splits |
| Contacts integration | D | Prefill payers from device contacts |

---

## Architecture Overview

### Data Flow (Serverless)
```
Camera/Gallery -> JPEG -> On-device ML Kit OCR -> parseReceiptText()
-> Receipt Review UI -> User edits -> Split Config -> (Payer Assignment)
-> Payment Summary -> Share links + Save to AsyncStorage
```

### State Management
- **AppProvider** (`lib/app-context.tsx`): Single context holding user, receipts, paymentRequests, paymentHandles, pendingImage
- **AsyncStorage**: 4 keys for persistent data (`@billbreeze_receipts`, `@billbreeze_requests`, `@billbreeze_user`, `@billbreeze_payment_handles`)
- **React Query**: Client configured, retry disabled
- **Auth guard**: Tabs layout redirects to sign-in when user is null, returns null during loading

### Split Calculation Logic
- **Equal**: `(subtotal + tax? + tip?) / num_payers`, Math.floor for base share, remainder cents go to first payer
- **Itemized**: Per-item share = `item.price / num_assigned`, then tax/tip distributed proportionally by each payer's subtotal share, remainder cents go to last payer
- **Tax/Tip toggles**: `includeTax`/`includeTip` booleans on Receipt preserve original values when toggled off

---

## Infrastructure

### Hosting & Deployment
| Component | Platform | Branch |
|-----------|----------|--------|
| Landing page | Vercel (billbreeze.co) | `main` (auto-deploy, root: `landing/`) |
| iOS app | EAS Build → App Store | `main` via `eas build` |
| Domain | GoDaddy | DNS → Vercel (A + CNAME) |

### Current Cost
| Component | Cost |
|-----------|------|
| OCR (ML Kit on-device) | $0 |
| Data storage (AsyncStorage) | $0 |
| Server hosting | $0 (none) |
| Landing page (Vercel hobby) | $0 |
| Domain (billbreeze.co) | ~$12/year |
| EAS Build (free tier) | $0 |
| Apple Developer | $99/year (pending) |
| **Total** | **~$111/year** |

---

## Known Issues

### Critical
1. **Data loss on uninstall** - All data stored in AsyncStorage only (Firebase planned for Phase A)
2. **No real authentication** - Local email/name only (Firebase Auth planned)
3. **No data encryption** - Plaintext JSON in AsyncStorage

### Moderate
4. **OCR accuracy** - Parser has 5 failing edge cases (grouped summaries, long names, next-line prices with noise)
5. **No error telemetry** - Errors logged to console only

### Minor
6. **Unused schema fields** - `imageUri`, `date`, `fixed` split mode
7. **Legacy server dir** - `server/` still in repo, Express dep in package.json (cleanup candidate)

---

## Resolved Issues

### March 13, 2026
- ~~Sign-out not redirecting~~ - Auth guard via `<Redirect>` in tabs layout
- ~~Tabs flash on cold start~~ - Return null while isLoading
- ~~Stale payer assignments~~ - useEffect with receiptId + lineItemIds deps
- ~~"Free forever" claims on landing page~~ - Removed (Pro $2.99 planned)
- ~~Landing page not deployed~~ - Live at billbreeze.co via Vercel
- ~~Roadmap in git~~ - Gitignored (internal planning doc)

### March 12, 2026
- ~~Fake social proof on landing page~~ - Replaced with real claims
- ~~Privacy claims too absolute~~ - Softened per PR review
- ~~APP_STORE_URL broken placeholder~~ - Conditional on APP_STORE_ID
- ~~Analytics overcounting~~ - trackEvent only fires when share occurs
- ~~Meta description too long~~ - Trimmed to ~155 chars

### March 11, 2026
- ~~Negative split remainders~~ - Math.floor for base share
- ~~Zero values treated as missing~~ - Nullish coalescing (?? 0)
- ~~Tax/tip rounding drift~~ - roundCents before proportion calc
- ~~Analytics race condition~~ - Promise queue serialization
- ~~Server dependency~~ - Replaced with on-device OCR

### March 9-10, 2026
- ~~Split rounding errors~~ - Remainder distribution
- ~~Stale closures in useEffect~~ - Fixed dependency arrays
- ~~Small touch targets~~ - All interactive elements 44px minimum
- ~~Missing error handling~~ - try-catch on all save/sign-out flows

---

## To Do List

### Immediate (Blocked on Apple Developer)
- [ ] Re-enroll Apple Developer Program ($99/year)
- [ ] Fill `eas.json` submit credentials (appleId, ascAppId, appleTeamId)
- [ ] Enable "Sign in with Apple" capability in Developer portal
- [ ] `eas build --platform ios --profile preview` → install via TestFlight
- [ ] Test core flow on device: scan → split → share
- [ ] Capture App Store screenshots (6.7" + 6.1") using seed data in app-context.tsx
- [ ] Remove seed data block after capturing
- [ ] Set `APP_STORE_ID` in `constants/app.ts`
- [ ] App Store copy from `cowork/deliverables/app-store-copy.md`
- [ ] `eas submit --platform ios` → App Store review

### Phase A: Firebase Integration (Before Marketing)
- [ ] Create Firebase project ("BillBreeze") in Firebase Console
- [ ] Enable Auth providers: Apple Sign-In + Email/Password
- [ ] Create Firestore database (production mode)
- [ ] Download `GoogleService-Info.plist` + `google-services.json`
- [ ] Install `@react-native-firebase/app`, `auth`, `firestore`, `expo-apple-authentication`
- [ ] Create `lib/firebase/` module (config, auth, firestore, migration)
- [ ] Update `lib/app-context.tsx` (Firebase Auth + Firestore)
- [ ] Create `app/sign-in.tsx` (Apple Sign-In + email/password)
- [ ] Deploy Firestore security rules
- [ ] Test migration: AsyncStorage → Firestore
- [ ] Test with dev build (`npx expo run:ios` — Expo Go won't work with native Firebase)

### Phase B: Launch & Early Traction (First 30 Days)
- [ ] Post in r/splitwise, r/personalfinance when Splitwise complaint threads appear
- [ ] Cross-post to Build in Public, Vibe Coding communities on X
- [ ] Add App Store download badge to billbreeze.co
- [ ] Monitor analytics counters
- [ ] "BillBreeze vs Splitwise" comparison blog post

### Phase C: Monetization (60-90 Days)
- [ ] Pro unlock ($2.99 one-time) via StoreKit 2
- [ ] Gate receipt history beyond 10 items
- [ ] Group presets, CSV export, custom split ratios

---

## Git Workflow
- Feature branches → PRs to `dev` → merge `dev` into `main`
- All PRs #1-#9 merged
- `main` is production-ready, `dev` is staging

---

## History
- **March 25, 2026**: Drafted X launch posts (4 variants: zero-infra dev angle + relatable broader angle). Saved to `cowork/deliverables/x-launch-posts.md`. Posting strategy: stagger dev + broad posts same day.
- **March 13, 2026**: Fixed sign-out redirect (auth guard in tabs layout). Removed "free forever" claims from landing page. Fixed stale payer assignments (lineItemIds dep). Deployed landing page to billbreeze.co via Vercel. Connected custom domain. Merged dev into main (PR #9). Created comprehensive to-do list.
- **March 12, 2026**: Landing page updates (remove fake stats, add Splitwise SEO section). Added BillBreeze branding to share text. Local analytics counters. Fixed split rounding, falsy zero checks, tax/tip proportional distribution. Vercel config. Created roadmap at docs/roadmap.md. Planned Firebase integration for Phase A.
- **March 11, 2026**: App Store preparation. Replaced server-side Vision API with on-device ML Kit OCR. Deleted Express server, Drizzle, and all server deps. Created EAS build config, privacy policy screen, wired settings. App is now fully serverless ($0/mo infrastructure). Blocked only on Apple Developer re-enrollment.
- **March 9-10, 2026**: Physical device testing on iPhone via Expo Go. Fixed sign-in keyboard, camera scanning, OCR parser improvements (currency detection, quantity parsing, expanded formats). Added landing page. Ran comprehensive QA audit. Implemented all 13 QA fixes: split rounding, security hardening, accessibility, error handling, storage defaults.
- **March 7-8, 2026**: GitHub export from Replit. README added. CLAUDE.md created. Full codebase review.
- **Prior**: Core MVP built on Replit with full scan-to-split flow.
