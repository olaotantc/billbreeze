# BillBreeze - Project Guide

## What is BillBreeze?
A bill-splitting mobile app built with Expo/React Native. Users scan receipts via camera, OCR extracts line items, then split costs equally or per-item among friends. Payment requests are shared via Venmo/PayPal/Cash App links.

## Tech Stack
- **Frontend**: Expo 54, React Native 0.81, TypeScript, Expo Router (file-based)
- **State**: React Context (`lib/app-context.tsx`) + AsyncStorage for persistence
- **Queries**: TanStack React Query v5 (retry disabled)
- **Backend**: Express.js on port 5000
- **OCR**: Google Cloud Vision API (DOCUMENT_TEXT_DETECTION)
- **Database**: Drizzle ORM + PostgreSQL configured but **not actively used** - all data in AsyncStorage
- **Validation**: Zod schemas in `shared/schema.ts`

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
server/
  index.ts            # Express setup, CORS, static serving
  routes.ts           # POST /api/ocr/parse (Vision API + text parser)
  storage.ts          # User storage interface (unused)
lib/
  app-context.tsx     # Global state provider (user, receipts, requests, handles)
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
```

## Key Data Models (shared/schema.ts)
- **Receipt**: id, merchantName, lineItems[], subtotal, tax, tip, total, splitMode, payers[], createdAt
- **LineItem**: id, name, price, assignedTo[]
- **PaymentRequest**: id, receiptId, payerName, amount, status (pending|paid), createdAt
- **Split modes**: "equal" and "itemized" are implemented. "fixed" exists in schema but is unused.

## User Flow
1. Welcome screen -> Sign in (email + name, stored locally)
2. Home tab -> Scan receipt (camera/gallery) -> JPEG conversion
3. Receipt review -> OCR parse -> manual edit items/prices
4. Split config -> choose equal/itemized, add payers, toggle tax/tip
5. Payer assignment (itemized only) -> assign items to people
6. Payment summary -> view breakdown, share via messaging, save requests
7. Inbox tab -> track pending/paid requests

## API Endpoints
- `POST /api/ocr/parse` - Takes `{ imageBase64 }`, returns `{ merchantName, lineItems, subtotal?, tax?, total? }`

## Environment Variables
- `GOOGLE_CLOUD_VISION_API_KEY` - Required for OCR
- `DATABASE_URL` - PostgreSQL connection (Drizzle, currently unused)

## AsyncStorage Keys
- `@billbreeze_receipts`, `@billbreeze_requests`, `@billbreeze_user`, `@billbreeze_payment_handles`

## Development Commands
- `npm run start` - Expo dev server
- `npm run server:dev` - Express backend (port 5000)
- `npm run db:push` - Drizzle schema push (unused)
- `npm run lint` / `npm run lint:fix` - ESLint

## Conventions
- TypeScript strict mode throughout
- Zod for runtime validation, inferred types for static typing
- Color tokens in `constants/colors.ts` - never use raw hex in screens
- Inter font family loaded via `@expo-google-fonts/inter`
- Error boundaries at app root; use `Alert.alert()` for user-facing errors
- No tests exist yet - be cautious with refactors

## Known Limitations
- All data is local-only (AsyncStorage) - lost on uninstall
- No real authentication system (local email/name only)
- No encryption on stored data
- OCR parser is regex-based and may miss unusual receipt formats
- No image saved with receipts (imageUri field unused)
- React Query retry is disabled
- Drizzle/PostgreSQL is configured but completely unused
