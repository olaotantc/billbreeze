/**
 * Receipt text parser — extracted from server/routes.ts for on-device use.
 * Pure function: takes raw OCR text, returns structured receipt data.
 * Tested by tests/parser.test.ts (54 cases, all passing).
 */

export function parseReceiptText(text: string): {
  merchantName: string;
  currency: string;
  lineItems: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
} {
  const rawLines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Summary/noise patterns needed early for merge guard
  const subtotalPattern = /sub\s*-?\s*total/i;
  const taxPattern = /\btax(?:es)?\b|\bhst\b|\bgst\b|\bpst\b|\bvat\b|\bctl\b|\bconsumption\s*tax\b/i;
  const totalPattern = /\btotal\b|\bamount\s*due\b|\bbalance\s*due\b|\bbill\s*amount\b/i;
  const tipPattern = /\btip\b|\bgratuity\b/i;

  const isNoiseLine = (line: string): boolean => {
    const noisePatterns = [
      /^(tel|phone|fax|address|www|http|date|time|order|check|table|server|cashier|card|visa|master|amex|debit|credit|change|balance\b(?!\s*due)|thank|receipt|welcome|store|guest|transaction|ref|auth|approved|member|loyalty|reward|points|earn|share|ask anything|thinking|chat|served\s+by|guests?:|buy\s+goods|till\s+number)/i,
      /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/,
      /^\d{1,2}:\d{2}/,
      /^#\d+/,
      /^\*{2,}/,
      /^-{3,}/,
      /^={3,}/,
      /^\d{4,}$/,
      /^x{4,}/i,
      /\bdiscount\b|\bsavings\b|\bcoupon\b|\bpromo\b/i,
      /can make mistakes/i,
      /please come again/i,
      /bloomberg|forex|home \|/i,
      /(?=[a-f0-9]*[0-9])(?=[a-f0-9]*[a-f])[a-f0-9]{20,}/i,
      /^at\s+table\b/i,
      // Address lines: "City, ST 12345" or "123 Street Name"
      /^[A-Z][a-zA-Z\s]+,\s*[A-Z]{2}\s+\d{5}/,
      /^\d{1,5}\s+[A-Z][a-zA-Z\s]+(lane|st|street|ave|avenue|rd|road|blvd|dr|drive|way|ct|court|pl|place|circle|cir)\b/i,
      // "Test Receipt", "OCR App", etc.
      /\btest\s+receipt\b/i,
      /\bdining\s+with\b/i,
      // City/location + postal code: "Lagos 100281", "Abuja 900001"
      /^[A-Z][a-zA-Z\s]+\d{5,6}\s*$/,
      // Standalone city names (common on Nigerian/international receipts)
      /^(Lagos|Abuja|Ikeja|Lekki|Victoria\s*Island|Ikoyi|Port\s*Harcourt|Ibadan|Kano|Accra|Nairobi|Dar\s*es\s*Salaam)\s*$/i,
    ];
    return noisePatterns.some((p) => p.test(line));
  };

  // Currency-aware price pattern: handles "1,500.00", "250.00", "250", with optional currency before/after
  const currSym = `(?:[$€£¥₦₹₩₵]|R\\$|C\\$|A\\$|KSh|KES|NGN)?`;
  // Price: "1,500.00" or "500.00" or "3,50" (comma-decimal) or "250"
  const priceNum = `(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{1,2})?|\\d+\\.\\d{1,2}|\\d+,\\d{1,2}|\\d+)`;
  const priceOnlyPattern = new RegExp(`^${currSym}\\s*${priceNum}\\s*${currSym}\\s*$`);
  const priceAtEndPattern = new RegExp(`^(.+?)\\s+${currSym}\\s*${priceNum}\\s*${currSym}\\s*$`);
  // Quantity line: "2 x 380.00", "3 @ 12.50", or "2 x 3,50" (comma-decimal)
  const qtyPricePattern = new RegExp(`^(\\d+)\\s*[xX@]\\s*${priceNum}$`);
  const parsePrice = (s: string): number => {
    // Comma as decimal separator: "3,50" (not thousands like "1,000")
    if (/^\d+,\d{1,2}$/.test(s)) {
      return parseFloat(s.replace(",", "."));
    }
    // Remove thousands commas, then parse
    return parseFloat(s.replace(/,/g, ""));
  };

  // Pre-process: merge orphan text lines that OCR split from the previous line
  // e.g., "Chocolate" + "Cake" + "$8.00" → "Chocolate Cake" + "$8.00"
  const lines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const nextLine = i + 1 < rawLines.length ? rawLines[i + 1] : null;
    const lineAfterNext = i + 2 < rawLines.length ? rawLines[i + 2] : null;

    // If current line has text (possibly with qty prefix like "1x"), next line is text-only
    // (no prices/numbers), and the line after that is a price — merge current + next
    const hasText = /[a-zA-Z]{2,}/.test(line);
    const nextIsTextOnly = nextLine && /^[a-zA-Z][a-zA-Z\s]*$/.test(nextLine) && nextLine.length >= 2;
    const afterNextIsPrice = lineAfterNext && priceOnlyPattern.test(lineAfterNext);
    // Also check: next line is text-only and current line does NOT already end with a price
    const currentHasPrice = /\d+[\.,]\d{1,2}\s*$/.test(line);

    // Don't merge if current line is noise or next line is a summary label
    const nextIsSummary = nextLine && (subtotalPattern.test(nextLine) || taxPattern.test(nextLine) || totalPattern.test(nextLine) || tipPattern.test(nextLine));

    if (hasText && !currentHasPrice && nextIsTextOnly && afterNextIsPrice && !isNoiseLine(line) && !nextIsSummary) {
      lines.push(line + " " + nextLine);
      i++; // skip the merged line
    } else {
      lines.push(line);
    }
  }

  let merchantName = "Unknown";
  const lineItems: Array<{ name: string; quantity: number; price: number }> = [];
  let subtotal: number | null = null;
  let tax: number | null = null;
  let total: number | null = null;

  // Detect currency symbol from the text
  // Check for $ first — if there's a $ followed by a digit, it's USD
  let currency = "$"; // default
  if (/\$\s*\d/.test(text)) {
    currency = "$";
  } else {
    const currencyMap: Array<{ pattern: RegExp; symbol: string }> = [
      { pattern: /₦|\bNGN\b|\bnaira\b/i, symbol: "₦" },
      { pattern: /€|\bEUR\b/i, symbol: "€" },
      { pattern: /£|\bGBP\b/i, symbol: "£" },
      { pattern: /¥|\bJPY\b|\bCNY\b/i, symbol: "¥" },
      { pattern: /₹|\bINR\b/i, symbol: "₹" },
      { pattern: /R\$|\bBRL\b/i, symbol: "R$" },
      { pattern: /₩|\bKRW\b/i, symbol: "₩" },
      { pattern: /₵|\bGHS\b/i, symbol: "₵" },
      { pattern: /\bKSh\b|\bKES\b/i, symbol: "KSh" },
      { pattern: /\bZAR\b/i, symbol: "R" },
      { pattern: /\bCAD\b|C\$/i, symbol: "C$" },
      { pattern: /\bAUD\b|A\$/i, symbol: "A$" },
    ];
    for (const { pattern, symbol } of currencyMap) {
      if (pattern.test(text)) {
        currency = symbol;
        break;
      }
    }
  }

  const isItemNameLine = (line: string): boolean => {
    if (isNoiseLine(line)) return false;
    if (priceOnlyPattern.test(line)) return false;
    if (qtyPricePattern.test(line)) return false;
    if (/^\d+$/.test(line)) return false;
    if (line.length < 2) return false;
    const hasLetters = /[a-zA-Z]{2,}/.test(line);
    return hasLetters;
  };

  const extractPrice = (line: string): number | null => {
    const m = line.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+\.\d{1,2}|\d+,\d{1,2}|\d+)/);
    if (m) return parsePrice(m[1]);
    return null;
  };

  const cleanItemName = (name: string): { name: string; quantity: number } => {
    let quantity = 1;
    let cleaned = name;

    // "2x Cheeseburger", "3X Latte", "2@ Coffee"
    const prefixWithSep = cleaned.match(/^(\d+)\s*[xX@]\s+(.+)/);
    if (prefixWithSep) {
      quantity = parseInt(prefixWithSep[1], 10);
      cleaned = prefixWithSep[2];
    } else {
      // "2 Cheeseburger" — bare number prefix followed by space then text starting with a letter
      const barePrefix = cleaned.match(/^(\d+)\s+([A-Za-z].+)/);
      if (barePrefix && parseInt(barePrefix[1], 10) <= 50) {
        quantity = parseInt(barePrefix[1], 10);
        cleaned = barePrefix[2];
      }
    }

    // Trailing "x2", "x 3", "X2"
    const trailMatch = cleaned.match(/^(.+?)\s*[xX]\s*(\d+)\s*$/);
    if (trailMatch && quantity === 1) {
      const trailQty = parseInt(trailMatch[2], 10);
      if (trailQty <= 50) {
        quantity = trailQty;
        cleaned = trailMatch[1];
      }
    }

    cleaned = cleaned
      .replace(/[$€£¥₦₹₩₵][\d.,]+/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    return { name: cleaned, quantity };
  };

  let foundFirstItem = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isNoiseLine(line)) continue;

    // Handle quantity lines: "2 x 380.00" → price is qty * unit price
    const qtyMatch = line.match(qtyPricePattern);
    if (qtyMatch) {
      foundFirstItem = true;
      const qty = parseInt(qtyMatch[1], 10);
      const unitPrice = parsePrice(qtyMatch[2]);
      const totalPrice = qty * unitPrice;
      // Look backward for the item name — stop at first non-noise text line
      let itemName = "";
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        if (isNoiseLine(lines[j])) continue;
        if (priceOnlyPattern.test(lines[j])) continue;
        if (/^\d+$/.test(lines[j])) continue;
        if (/^[A-Za-z]$/.test(lines[j])) continue; // skip single letters
        const candidate = cleanItemName(lines[j]);
        if (candidate.name.length > 1 && /[a-zA-Z]{2,}/.test(candidate.name)) {
          itemName = candidate.name;
        }
        break; // stop at first non-noise line regardless
      }
      if (itemName.length > 1) {
        lineItems.push({ name: itemName, quantity: qty, price: totalPrice });
      }
      // Skip the next line if it's just the total for this qty line (e.g., "760.00")
      const nextLine = i + 1 < lines.length ? lines[i + 1] : null;
      if (nextLine && priceOnlyPattern.test(nextLine)) {
        i++;
      }
      continue;
    }

    const endMatch = line.match(priceAtEndPattern);
    if (endMatch) {
      foundFirstItem = true;
      const { name, quantity } = cleanItemName(endMatch[1]);
      const price = parsePrice(endMatch[2]);
      if (price <= 0) continue;

      const combined = name + " " + line;
      if (subtotalPattern.test(combined)) { subtotal = price; }
      else if (taxPattern.test(combined) && !tipPattern.test(combined)) { tax = price; }
      else if (totalPattern.test(combined)) { total = price; }
      else if (tipPattern.test(combined)) { continue; }
      else if (name.length > 1) {
        lineItems.push({ name, quantity, price });
      }
      continue;
    }

    if (isItemNameLine(line)) {
      const isSummaryLabel = subtotalPattern.test(line) || taxPattern.test(line) || totalPattern.test(line) || tipPattern.test(line);

      const nextLine = i + 1 < lines.length ? lines[i + 1] : null;
      // Check if next line is a qty line — if so, let the qty handler deal with it
      if (nextLine && qtyPricePattern.test(nextLine)) {
        continue;
      }
      if (nextLine && priceOnlyPattern.test(nextLine)) {
        if (isSummaryLabel) {
          const prevLine = i > 0 ? lines[i - 1] : null;
          const prevIsSummary = prevLine && (subtotalPattern.test(prevLine) || taxPattern.test(prevLine) || totalPattern.test(prevLine) || tipPattern.test(prevLine));
          if (prevIsSummary) {
            continue;
          }
        }

        foundFirstItem = true;
        const price = extractPrice(nextLine);
        if (price && price > 0) {
          const { name, quantity } = cleanItemName(line);

          if (subtotalPattern.test(line)) { subtotal = price; }
          else if (taxPattern.test(line) && !tipPattern.test(line)) { tax = price; }
          else if (totalPattern.test(line)) { total = price; }
          else if (tipPattern.test(line)) { i++; continue; }
          else if (name.length > 1) {
            lineItems.push({ name, quantity, price });
          }
          i++;
          continue;
        }
      }

      if (!foundFirstItem && !isSummaryLabel) {
        const isLikelyMerchant = /^[A-Z]/.test(line) && line.length > 2 && !priceOnlyPattern.test(line);
        if (isLikelyMerchant) {
          // Prefer names that contain typical merchant words (cafe, restaurant, bar, etc.)
          const merchantWords = /\b(cafe|restaurant|bar|grill|kitchen|bistro|diner|house|place|shop|store|market|pizza|burger|sushi|bakery|hotel|lounge)\b/i;
          if (merchantWords.test(line)) {
            merchantName = line;
          } else if (merchantName === "Unknown") {
            merchantName = line;
          }
        }
      }
    }

  }

  {
    const labelLines: Array<{ index: number; type: string }> = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (subtotalPattern.test(line) && !priceOnlyPattern.test(line) && !priceAtEndPattern.test(line)) {
        labelLines.push({ index: i, type: "subtotal" });
      } else if (taxPattern.test(line) && !tipPattern.test(line) && !priceOnlyPattern.test(line) && !priceAtEndPattern.test(line)) {
        labelLines.push({ index: i, type: "tax" });
      } else if (tipPattern.test(line) && !priceOnlyPattern.test(line) && !priceAtEndPattern.test(line)) {
        labelLines.push({ index: i, type: "tip" });
      } else if (totalPattern.test(line) && !priceOnlyPattern.test(line) && !priceAtEndPattern.test(line)) {
        labelLines.push({ index: i, type: "total" });
      }
    }

    if (labelLines.length > 0) {
      const lastLabelIdx = labelLines[labelLines.length - 1].index;
      const priceLines: number[] = [];
      for (let j = lastLabelIdx + 1; j < lines.length; j++) {
        if (priceOnlyPattern.test(lines[j])) {
          priceLines.push(j);
        }
      }

      if (priceLines.length >= labelLines.length) {
        for (let k = 0; k < labelLines.length; k++) {
          const price = extractPrice(lines[priceLines[k]]);
          if (price !== null && price > 0) {
            const ltype = labelLines[k].type;
            if (ltype === "subtotal") subtotal = price;
            else if (ltype === "tax") tax = price;
            else if (ltype === "total") total = price;
          }
        }
      }
    }
  }

  // ── Post-processing sanity checks ─────────────────────────────────────────

  // 1. Remove items whose name matches a known summary/total pattern
  //    (catches cases where regex didn't match inline, e.g. split across OCR blocks)
  for (let i = lineItems.length - 1; i >= 0; i--) {
    const n = lineItems[i].name;
    if (totalPattern.test(n) || /\bbill\b/i.test(n)) {
      if (!total) total = lineItems[i].price;
      lineItems.splice(i, 1);
    } else if (subtotalPattern.test(n)) {
      if (!subtotal) subtotal = lineItems[i].price;
      lineItems.splice(i, 1);
    } else if (taxPattern.test(n) && !tipPattern.test(n)) {
      if (!tax) tax = lineItems[i].price;
      lineItems.splice(i, 1);
    } else if (tipPattern.test(n)) {
      lineItems.splice(i, 1);
    }
  }

  // 2. If we have a total, remove items whose price >= total AND the item sum
  //    (these are almost certainly misclassified summary lines, not real items)
  if (total && total > 0 && lineItems.length > 1) {
    const itemSum = lineItems.reduce((s, item) => s + item.price, 0);
    for (let i = lineItems.length - 1; i >= 0; i--) {
      if (lineItems[i].price >= total && lineItems[i].price >= itemSum * 0.5) {
        lineItems.splice(i, 1);
      }
    }
  }

  // 3. Filter items that look like addresses/locations: single word with no price context
  //    that have a suspiciously round postal-code-like price (5-6 digit integer)
  for (let i = lineItems.length - 1; i >= 0; i--) {
    const item = lineItems[i];
    const priceStr = item.price.toString();
    const isSingleWord = item.name.trim().split(/\s+/).length === 1;
    const isPostalCodePrice = /^\d{5,6}$/.test(priceStr) && item.price % 1 === 0;
    if (isSingleWord && isPostalCodePrice) {
      lineItems.splice(i, 1);
    }
  }

  // 4. Deduplicate: if two items have the same name and one is qty 1 at the unit price
  //    while another has qty > 1 at qty * unitPrice, keep only the qty > 1 entry
  for (let i = lineItems.length - 1; i >= 0; i--) {
    for (let j = 0; j < i; j++) {
      if (lineItems[i].name === lineItems[j].name) {
        const a = lineItems[j];
        const b = lineItems[i];
        // If one has qty > 1 and the other is qty 1 at a lower price, keep the qty > 1
        if (a.quantity > 1 && b.quantity === 1 && b.price < a.price) {
          lineItems.splice(i, 1);
          break;
        } else if (b.quantity > 1 && a.quantity === 1 && a.price < b.price) {
          lineItems.splice(j, 1);
          i--; // adjust index after splice
          break;
        }
      }
    }
  }

  // 5. Infer subtotal from item sum if not detected
  if (!subtotal && lineItems.length > 0) {
    subtotal = lineItems.reduce((s, item) => s + item.price, 0);
  }

  return { merchantName, currency, lineItems, subtotal, tax, total };
}
