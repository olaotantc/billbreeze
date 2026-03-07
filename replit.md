# SplitSnap - Bill Splitting App

## Overview
Mobile bill-splitting app built with Expo React Native. Photograph a restaurant receipt, extract line items via OCR, calculate tax/tip-aware splits among friends, and generate shareable payment request summaries.

## Architecture
- **Frontend**: Expo React Native (TypeScript) with Expo Router file-based routing
- **Backend**: Express server on port 5000 with OCR proxy endpoint
- **OCR**: Google Cloud Vision API (via server proxy at `/api/ocr/parse`)
- **Storage**: AsyncStorage for local data persistence
- **State**: React Context (`AppProvider`) + useState for local state

## Key Files
### Frontend
- `app/_layout.tsx` - Root layout with providers (QueryClient, AppProvider, KeyboardProvider)
- `app/index.tsx` - Welcome/onboarding screen
- `app/sign-in.tsx` - Sign in modal
- `app/(tabs)/` - Main tab navigation (Home, Inbox, Settings)
- `app/camera.tsx` - Camera/gallery capture screen
- `app/receipt-review.tsx` - OCR results + editable line items
- `app/split-config.tsx` - Split mode selector + payer management
- `app/payer-assignment.tsx` - Itemized assignment of items to payers
- `app/payment-summary.tsx` - Per-person breakdown + share sheet

### Backend
- `server/routes.ts` - OCR parsing endpoint (`POST /api/ocr/parse`)
- `server/index.ts` - Express server setup with CORS

### Shared
- `shared/schema.ts` - TypeScript types (Receipt, LineItem, PaymentRequest)
- `lib/app-context.tsx` - Global state provider
- `lib/storage.ts` - AsyncStorage CRUD operations
- `lib/utils.ts` - Formatting helpers
- `lib/query-client.ts` - React Query setup + API helpers
- `constants/colors.ts` - Theme colors (teal/gold palette)

## Design
- **Primary**: #004E45 (deep teal)
- **Accent**: #F0B429 (warm gold)
- **Surface**: #F7FBFA
- **Font**: Inter (400/500/600/700)

## Environment Variables
- `GOOGLE_CLOUD_VISION_API_KEY` - Required for receipt OCR scanning

## Workflows
- `Start Backend` - Express server (port 5000)
- `Start Frontend` - Expo dev server (port 8081)
