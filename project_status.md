# BillBreeze - Project Status

**Last Updated**: 2026-03-08
**Platform**: Expo 54 / React Native 0.81 / Express.js
**Stage**: MVP Complete (Local-Only)
**Repo**: https://github.com/olaotantc/billbreeze
**Replit**: https://replit.com/@OlaotanTowry-Co/Bill-Splitter

---

## Feature Status

### Core Features (Complete)
| Feature | Status | File(s) |
|---------|--------|---------|
| Receipt scanning (camera) | Done | `app/camera.tsx` |
| Receipt scanning (gallery import) | Done | `app/(tabs)/index.tsx` |
| JPEG conversion (HEIC fix) | Done | `app/camera.tsx` |
| OCR extraction (Google Vision) | Done | `server/routes.ts` |
| Manual item editing | Done | `app/receipt-review.tsx` |
| Equal bill split | Done | `app/split-config.tsx`, `app/payment-summary.tsx` |
| Itemized bill split | Done | `app/payer-assignment.tsx`, `app/payment-summary.tsx` |
| Proportional tax/tip distribution | Done | `app/payment-summary.tsx` |
| Payment link generation (Venmo, PayPal, Cash App) | Done | `app/payment-summary.tsx` |
| Share breakdown via messaging | Done | `app/payment-summary.tsx` |
| Payment request tracking (inbox) | Done | `app/(tabs)/inbox.tsx` |
| Pending/paid status toggle | Done | `app/(tabs)/inbox.tsx` |
| Settings (payment handles) | Done | `app/(tabs)/settings.tsx` |
| Local data persistence | Done | `lib/storage.ts`, `lib/app-context.tsx` |
| Error boundaries | Done | `components/ErrorBoundary.tsx` |

### Partially Implemented
| Feature | Status | Notes |
|---------|--------|-------|
| Fixed split mode | Schema only | Defined in `shared/schema.ts` but no UI |
| Receipt image storage | Schema only | `imageUri` field exists but never populated |
| Receipt date tracking | Schema only | `date` field exists but never set from OCR |
| PostgreSQL persistence | Configured | Drizzle ORM set up, migrations folder empty, all data uses AsyncStorage |
| Web deployment | Configured | Express serves static Expo builds, untested |

### Not Started
| Feature | Priority | Description |
|---------|----------|-------------|
| Server-side data persistence | High | Migrate from AsyncStorage to PostgreSQL via Drizzle |
| User authentication | High | Replace local-only sign-in with real auth (OAuth/email verification) |
| Data encryption | High | Encrypt sensitive data in storage |
| Receipt photo attachment | Medium | Save and display receipt images with receipts |
| Search/filter receipts | Medium | Find receipts by merchant, date, or amount |
| Edit saved receipts | Medium | Allow modifications after initial save |
| Delete payment requests | Medium | Remove items from inbox |
| Export data | Medium | CSV/PDF export of receipts and payment history |
| Push notifications | Medium | Reminders for unpaid requests |
| Multi-device sync | Medium | Cloud-backed data accessible across devices |
| Undo/redo | Low | Reversible delete and edit actions |
| Receipt duplicate detection | Low | Prevent scanning the same receipt twice |
| Analytics/telemetry | Low | Usage tracking and error reporting |
| Unit/integration tests | Low | No test suite exists |
| CI/CD pipeline | Low | No automated build/deploy |

---

## Architecture Overview

### Data Flow
```
Camera/Gallery -> JPEG base64 -> POST /api/ocr/parse -> Google Vision API
-> parseReceiptText() regex parser -> OCR response -> Receipt Review UI
-> User edits -> Split Config -> (Payer Assignment) -> Payment Summary
-> Share links + Save to AsyncStorage
```

### State Management
- **AppProvider** (`lib/app-context.tsx`): Single context holding user, receipts, paymentRequests, paymentHandles, pendingImage
- **AsyncStorage**: 4 keys for persistent data (`@billbreeze_receipts`, `@billbreeze_requests`, `@billbreeze_user`, `@billbreeze_payment_handles`)
- **React Query**: Used for OCR API call only (retry disabled)

### Split Calculation Logic
- **Equal**: `(subtotal + tax? + tip?) / num_payers`
- **Itemized**: Per-item share = `item.price / num_assigned`, then tax/tip distributed proportionally by each payer's subtotal share

---

## Known Issues

### Critical
1. **Data loss on uninstall** - All data stored in AsyncStorage only, no server backup
2. **No real authentication** - Local email/name only, no identity verification
3. **No data encryption** - Plaintext JSON in AsyncStorage

### Moderate
4. **OCR accuracy** - Regex parser may miss items with unusual formatting; no confidence scores
5. **No error telemetry** - Errors logged to console only
6. **CORS overly permissive** - Allows `localhost:*` in development
7. **Basic API rate limiting only** - 10 req/min on `/api/ocr`; needs tuning/expansion for production

### Minor
8. **Unused Drizzle setup** - Technical debt; configured but never used
9. **Unused schema fields** - `imageUri`, `date`, `fixed` split mode
10. **No input sanitization** - Receipt text and user inputs not sanitized

---

## Codebase Metrics
- **Source files**: 20 TypeScript files
- **Screens**: 10 (welcome, sign-in, home, camera, receipt-review, split-config, payer-assignment, payment-summary, inbox, settings)
- **API endpoints**: 1 (POST /api/ocr/parse)
- **Components**: 3 reusable (ErrorBoundary, ErrorFallback, KeyboardAwareScrollViewCompat)
- **Dependencies**: 38 production, 8 dev
- **Test coverage**: minimal (52-case OCR parser test suite in `tests/parser.test.ts`)

---

## History
- **March 7, 2026**: GitHub export from Replit (18 commits). README added. Project status created.
- **March 8, 2026**: Full codebase review. CLAUDE.md created. Project status rewritten with comprehensive feature tracking, architecture docs, and issue inventory.
- **Prior**: Core MVP built on Replit with full scan-to-split flow. Payment links added to shared requests and settings.

---

## Next Steps (Recommended Priority)
1. Set up local development environment (install deps, configure env vars)
2. Add PostgreSQL persistence via existing Drizzle config
3. Implement proper authentication (consider Clerk, Supabase Auth, or Firebase Auth)
4. Add basic test suite for split calculations and OCR parsing
5. Set up CI/CD with GitHub Actions
6. Implement receipt image storage
7. Add search/filter to receipt list
8. Submit to App Store / Google Play via EAS Build
