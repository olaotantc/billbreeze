# BillBreeze 💸

A smart mobile bill-splitting app built with React Native (Expo) that lets you scan receipts, split costs, and send payment requests — all in one place.

## Features

- **Receipt Scanning** — Use your camera or import from your gallery. BillBreeze uses Google Cloud Vision OCR to automatically extract merchant name, line items, subtotal, tax, and total.
- **Flexible Split Modes** — Split bills equally among all payers, itemize line items per person, or assign fixed amounts.
- **Payer Assignment** — Assign specific items or amounts to individuals in your group.
- **Payment Requests & Inbox** — Send payment requests directly to friends and track pending/paid status in the inbox.
- **Payment Links** — Automatically generates tappable payment links for Venmo, PayPal, and Cash App in shared messages.
- **Share via Messaging** — Share a payment summary with itemised amounts and direct payment links.
- **Settings** — Configure your Venmo handle, PayPal.me username, and Cash App $cashtag so payment links are included in every request.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo ~54 / React Native |
| Language | TypeScript |
| Navigation | Expo Router (file-based) |
| State / Data | TanStack Query + AsyncStorage |
| Backend | Node.js / Express |
| Database | PostgreSQL via Drizzle ORM |
| OCR | Google Cloud Vision API |
| Validation | Zod |
| UI | Expo Vector Icons, Expo Blur, Expo Linear Gradient |

## Project Structure

```
├── app/                     # Expo Router screens
│   ├── (tabs)/              # Bottom-tab screens
│   │   ├── index.tsx        # Home — receipt list
│   │   ├── inbox.tsx        # Payment requests inbox
│   │   └── settings.tsx     # Payment handle settings
│   ├── camera.tsx           # Camera capture screen
│   ├── receipt-review.tsx   # OCR review & edit
│   ├── split-config.tsx     # Split mode configuration
│   ├── payer-assignment.tsx # Assign items to payers
│   └── payment-summary.tsx  # Summary & share screen
├── server/                  # Express backend
│   ├── index.ts             # Server entry point
│   └── routes.ts            # API routes (OCR endpoint)
├── shared/
│   └── schema.ts            # Zod schemas & TypeScript types
├── lib/
│   └── storage.ts           # AsyncStorage helpers
├── components/              # Shared UI components
└── constants/               # Colours, config
```

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI
- A Google Cloud Vision API key (for receipt scanning)
- PostgreSQL database

### Installation

```bash
git clone https://github.com/olaotantc/billbreeze.git
cd billbreeze
npm install
```

### Environment Variables

Create a `.env` file in the root (or set secrets in Replit):

```env
GOOGLE_CLOUD_VISION_API_KEY=your_api_key_here
DATABASE_URL=your_postgres_connection_string
```

### Running the App

```bash
# Start the Express backend
npm run server:dev

# Start the Expo frontend
npm run expo:dev
```

Or use the combined Replit workflow which starts both automatically.

### Building for Production

```bash
# Static web build
npm run expo:static:build

# Production server
npm run server:build && npm run server:prod
```

## How It Works

1. **Scan or Import** a receipt from the home screen.
2. **Review & Edit** the OCR-extracted items, merchant name, and totals.
3. **Choose a Split Mode** — equal, itemized, or fixed.
4. **Assign Payers** — drag items to each person or set amounts.
5. **View the Payment Summary** — see exactly who owes what.
6. **Share** — tap "Send Request" or "Share All" to send messages with tappable Venmo / PayPal / Cash App links.

## License

MIT
