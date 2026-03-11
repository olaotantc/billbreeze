# BillBreeze - Project Status

**Last Updated**: 2026-03-11
**Platform**: Expo 54 / React Native 0.81 (serverless)
**Stage**: App Store Ready (pending Apple Developer enrollment)
**Repo**: https://github.com/olaotantc/billbreeze

---

## Feature Status

### Core Features (Complete)
| Feature | Status | File(s) |
|---------|--------|---------|
| Receipt scanning (camera) | Done | `app/camera.tsx` |
| Receipt scanning (gallery import) | Done | `app/(tabs)/index.tsx` |
| JPEG conversion (HEIC fix) | Done | `app/camera.tsx` |
| On-device OCR (ML Kit) | Done | `app/receipt-review.tsx`, `lib/ocr-parser.ts` |
| Receipt text parser | Done | `lib/ocr-parser.ts` (53 tests, 48 passing) |
| Manual item editing | Done | `app/receipt-review.tsx` |
| Equal bill split | Done | `app/split-config.tsx`, `app/payment-summary.tsx` |
| Itemized bill split | Done | `app/payer-assignment.tsx`, `app/payment-summary.tsx` |
| Proportional tax/tip distribution | Done | `app/payment-summary.tsx`, `app/payer-assignment.tsx` |
| Payment link generation (Venmo, PayPal, Cash App) | Done | `app/payment-summary.tsx` |
| Share breakdown via messaging | Done | `app/payment-summary.tsx` |
| Payment request tracking (inbox) | Done | `app/(tabs)/inbox.tsx` |
| Pending/paid status toggle | Done | `app/(tabs)/inbox.tsx` |
| Settings (payment handles) | Done | `app/(tabs)/settings.tsx` |
| Local data persistence | Done | `lib/storage.ts`, `lib/app-context.tsx` |
| Error boundaries | Done | `components/ErrorBoundary.tsx` |
| Currency detection (OCR) | Done | `lib/ocr-parser.ts` |
| Quantity parsing (OCR) | Done | `lib/ocr-parser.ts` |
| Privacy policy (in-app) | Done | `app/privacy.tsx` |
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

### Not Started (Phase 3 — PRD Parity, if needed)
| Feature | Priority | Description |
|---------|----------|-------------|
| Stripe Payment Links | Medium | Per-person Stripe links (requires backend) |
| Firebase Auth + Firestore | Medium | Cross-device sync, real auth |
| Camera edge detection | Medium | Auto-capture with document detection |
| Push notifications | Medium | Payment status reminders |
| QR code generation | Low | Alternative to text sharing |
| Custom percentage split | Low | PRD spec, not user-requested |
| CSV/PDF export | Low | Business expense reporting |
| Analytics/telemetry | Low | Usage tracking |
| Contacts integration | Low | Prefill payers from device contacts |

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

### Split Calculation Logic
- **Equal**: `(subtotal + tax? + tip?) / num_payers`, remainder cents go to first payer
- **Itemized**: Per-item share = `item.price / num_assigned`, then tax/tip distributed proportionally by each payer's subtotal share, remainder cents go to last payer
- **Tax/Tip toggles**: `includeTax`/`includeTip` booleans on Receipt preserve original values when toggled off

---

## Infrastructure

### What Was Removed (March 11, 2026)
| Component | Reason |
|-----------|--------|
| Express.js server (`server/`) | Replaced by on-device OCR |
| Google Cloud Vision API | Replaced by ML Kit (free, on-device) |
| Drizzle ORM + PostgreSQL | Never used, dead weight |
| `express`, `helmet`, `express-rate-limit`, `http-proxy-middleware`, `ws`, `pg` | Server deps |
| `@expo/ngrok` | Replit tunneling, not needed |
| `drizzle-orm`, `drizzle-zod`, `drizzle-kit` | Unused DB deps |

### Current Cost
| Component | Cost |
|-----------|------|
| OCR (ML Kit on-device) | $0 |
| Data storage (AsyncStorage) | $0 |
| Server hosting | $0 (none) |
| EAS Build (free tier) | $0 |
| Apple Developer | $99/year (pending) |
| **Total** | **$99/year** |

---

## Known Issues

### Critical
1. **Data loss on uninstall** - All data stored in AsyncStorage only
2. **No real authentication** - Local email/name only
3. **No data encryption** - Plaintext JSON in AsyncStorage

### Moderate
4. **OCR accuracy** - Parser has 5 failing edge cases (grouped summaries, long names, next-line prices with noise)
5. **No error telemetry** - Errors logged to console only

### Minor
6. **Unused schema fields** - `imageUri`, `date`, `fixed` split mode
7. **Typed routes stale** - New `privacy.tsx` route needs Expo type generation

### Resolved (March 11, 2026)
- ~~Server dependency~~ - Replaced with on-device OCR
- ~~Vision API cost~~ - Eliminated
- ~~Dead Drizzle/PostgreSQL deps~~ - Removed
- ~~Settings "Coming soon" placeholders~~ - Wired to About, Privacy, Help
- ~~Missing privacy policy~~ - In-app screen created
- ~~Missing EAS config~~ - eas.json + .easignore created
- ~~Missing iOS permissions~~ - Camera + photo library strings added
- ~~Replit origin in app.json~~ - Removed

### Resolved (March 10, 2026)
- ~~No input sanitization~~ - Negative prices prevented, float artifacts fixed
- ~~Split rounding errors~~ - Remainder distribution ensures shares sum exactly to total
- ~~Stale closures in useEffect~~ - Fixed dependency arrays with hasInitialized ref
- ~~OCR errors leaked to client~~ - Sanitized error responses
- ~~Small touch targets~~ - All interactive elements now 44px minimum
- ~~Missing error handling~~ - try-catch on all save/sign-out flows with loading states

---

## Codebase Metrics
- **Source files**: ~18 TypeScript files
- **Screens**: 11 (welcome, sign-in, home, camera, receipt-review, split-config, payer-assignment, payment-summary, inbox, settings, privacy)
- **API endpoints**: 0 (fully on-device)
- **Components**: 3 reusable (ErrorBoundary, ErrorFallback, KeyboardAwareScrollViewCompat)
- **Dependencies**: 33 production, 6 dev
- **Test coverage**: 53-case OCR parser test suite (`tests/parser.test.ts`), 48 passing

---

## History
- **March 11, 2026**: App Store preparation. Replaced server-side Vision API with on-device ML Kit OCR. Deleted Express server, Drizzle, and all server deps. Created EAS build config, privacy policy screen, wired settings. App is now fully serverless ($0/mo infrastructure). Blocked only on Apple Developer re-enrollment.
- **March 9-10, 2026**: Physical device testing on iPhone via Expo Go. Fixed sign-in keyboard, camera scanning, OCR parser improvements (currency detection, quantity parsing, expanded formats). Added landing page. Ran comprehensive QA audit. Implemented all 13 QA fixes: split rounding, security hardening, accessibility, error handling, storage defaults.
- **March 7-8, 2026**: GitHub export from Replit. README added. CLAUDE.md created. Full codebase review.
- **Prior**: Core MVP built on Replit with full scan-to-split flow.

---

## Next Steps
1. **Re-enroll Apple Developer Program** ($99/year) — hard blocker
2. Fill `eas.json` submit credentials (appleId, ascAppId, appleTeamId)
3. Generate App Store screenshots (6.7" + 6.1")
4. `eas build --platform ios --profile preview` → TestFlight test
5. `eas submit --platform ios` → App Store review
6. Post-launch: monitor OCR accuracy, fix 5 failing parser edge cases
7. Phase 3 (if user feedback demands): Stripe, Firebase, edge detection, push notifications
