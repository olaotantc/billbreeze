// TODO: Replace with real App Store ID after Apple Developer enrollment
export const APP_STORE_ID = "";

export const APP_STORE_URL = APP_STORE_ID
  ? `https://apps.apple.com/app/billbreeze/id${APP_STORE_ID}`
  : "";

export const SHARE_FOOTER = APP_STORE_URL
  ? `\n\nSplit with BillBreeze \u2014 free receipt scanning, no limits\n${APP_STORE_URL}`
  : "\n\nSplit with BillBreeze \u2014 free receipt scanning, no limits";
