# BillBreeze - Project Guide

## What is BillBreeze?
A bill-splitting mobile app built with Expo/React Native. Users scan receipts via camera, on-device OCR extracts line items, then split costs equally or per-item among friends. Payment requests are shared via Venmo/PayPal/Cash App links.

## Tech Stack
- **Frontend**: Expo 54, React Native 0.81, TypeScript, Expo Router (file-based)
- **State**: React Context (`lib/app-context.tsx`) + AsyncStorage for persistence
- **Queries**: TanStack React Query v5 (retry disabled)
- **OCR**: On-device via `react-native-mlkit-ocr` (free, no server/API keys needed)
- **Parser**: `lib/ocr-parser.ts` — regex-based text extraction from OCR output
- **Validation**: Zod schemas in `shared/schema.ts`
- **No backend required** — fully client-side, zero infrastructure costs

## Project Structure
```
app/                  # Expo Router screens
  (tabs)/             # Tab navigator: Home, Inbox, Settings
  camera.tsx          # Camera capture + JPEG conversion
  receipt-review.tsx  # OCR results + manual item editing
  split-config.tsx    # Equal/itemized mode + payer setup
  payer-assignment.tsx # Per-item assignment (itemized only)
  payment-summary.tsx # Final breakdown + share/save
  sign-in.tsx         # Local auth (email + name)
  privacy.tsx         # In-app privacy policy
lib/
  app-context.tsx     # Global state provider (user, receipts, requests, handles)
  ocr-parser.ts       # Receipt text parser (extracted from old server/routes.ts)
  storage.ts          # AsyncStorage CRUD helpers
  utils.ts            # Price formatting, date formatting
  query-client.ts     # React Query client config
shared/
  schema.ts           # Zod schemas: Receipt, LineItem, PaymentRequest, OCR response
components/
  ErrorBoundary.tsx   # App-level error catching
  ErrorFallback.tsx   # Error UI with dev stack trace modal
  KeyboardAwareScrollViewCompat.tsx
constants/
  colors.ts           # Design tokens (teal #004E45, gold #F0B429)
tests/
  parser.test.ts      # OCR parser test suite (54 cases, all passing)
```

## Key Data Models (shared/schema.ts)
- **Receipt**: id, merchantName, lineItems[], subtotal, tax, tip, total, splitMode, payers[], createdAt
- **LineItem**: id, name, price, assignedTo[]
- **PaymentRequest**: id, receiptId, payerName, amount, status (pending|paid), createdAt
- **Split modes**: "equal" and "itemized" are implemented. "fixed" exists in schema but is unused.

## User Flow
1. Welcome screen -> Sign in (email + name, stored locally)
2. Home tab -> Scan receipt (camera/gallery) -> JPEG conversion
3. Receipt review -> On-device OCR parse -> manual edit items/prices
4. Split config -> choose equal/itemized, add payers, toggle tax/tip
5. Payer assignment (itemized only) -> assign items to people
6. Payment summary -> view breakdown, share via messaging, save requests
7. Inbox tab -> track pending/paid requests

## AsyncStorage Keys
- `@billbreeze_receipts`, `@billbreeze_requests`, `@billbreeze_user`, `@billbreeze_payment_handles`

## Development Commands
- `npm run start` - Expo dev server
- `npm run test` / `npm run test:parser` - Run OCR parser tests
- `npm run lint` / `npm run lint:fix` - ESLint

## EAS Build & Submit
- `eas.json` configured with development, preview, and production profiles
- `.easignore` configured to exclude non-essential files from builds
- Submit credentials (appleId, ascAppId, appleTeamId) need to be added to `eas.json` before App Store submission

## Marketing Assets
- App Store screenshots: `marketing/appstore-6.7/` (1290x2796) and `marketing/appstore-6.1/` (1179x2556)
- Framed screenshots for social/landing: `marketing/framed-*.png`
- App Store copy: `cowork/deliverables/app-store-copy.md`
- X launch posts: `cowork/deliverables/x-launch-posts.md` + `marketing/x-post-*.md`

## Conventions
- TypeScript strict mode throughout
- Zod for runtime validation, inferred types for static typing
- Color tokens in `constants/colors.ts` - never use raw hex in screens
- Inter font family loaded via `@expo-google-fonts/inter`
- Error boundaries at app root; use `Alert.alert()` for user-facing errors
- OCR parser has a 54-case test suite (all passing); other areas lack tests, so be cautious with refactors

## Cowork Coordination
This project uses a shared workflow between Claude Code (CLI) and Claude Cowork (web).
- **`handoff.md`** — Activity log. Read before starting work, append after completing work.
- **`cowork/COWORK.md`** — Cowork's instructions and role boundaries.
- **`cowork/deliverables/`** — Cowork's output (copy, specs, asset plans). Pick up files here to implement.
- **`project_status.md`** — Source of truth for feature/issue status. Both agents update this.
- After completing any task, log it in `handoff.md` with a dated entry.

## Known Limitations
- All data is local-only (AsyncStorage) - lost on uninstall
- No real authentication system (local email/name only)
- No encryption on stored data
- OCR parser is regex-based and may miss unusual receipt formats
- No image saved with receipts (imageUri field unused)
- React Query retry is disabled
