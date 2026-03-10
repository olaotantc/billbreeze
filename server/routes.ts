import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/ocr/parse", async (req: Request, res: Response) => {
    try {
      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ error: "Request body is required with Content-Type: application/json" });
      }

      let { imageBase64 } = req.body;

      if (!imageBase64 || typeof imageBase64 !== "string") {
        return res.status(400).json({ error: "imageBase64 is required and must be a string" });
      }

      console.log("[OCR-DEBUG] Raw base64 length:", imageBase64.length);
      console.log("[OCR-DEBUG] Raw base64 first 80:", imageBase64.substring(0, 80));

      // Strip data URI prefix if present
      if (imageBase64.includes(",")) {
        imageBase64 = imageBase64.split(",")[1];
        console.log("[OCR-DEBUG] Stripped data URI prefix, new length:", imageBase64.length);
      }

      const base64Pattern = /^[A-Za-z0-9+/=\s]+$/;
      if (!base64Pattern.test(imageBase64)) {
        return res.status(400).json({ error: "imageBase64 contains invalid characters" });
      }

      imageBase64 = imageBase64.replace(/\s/g, "");
      console.log("[OCR-DEBUG] After whitespace cleanup, length:", imageBase64.length);

      const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Google Cloud Vision API key not configured" });
      }

      const visionResponse = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [
              {
                image: { content: imageBase64 },
                features: [
                  { type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 },
                  { type: "TEXT_DETECTION", maxResults: 1 },
                ],
              },
            ],
          }),
        }
      );

      if (!visionResponse.ok) {
        const errorText = await visionResponse.text();
        console.error("Vision API error (status " + visionResponse.status + "):", errorText);
        return res.status(500).json({ error: "OCR service error" });
      }

      const visionData = await visionResponse.json() as {
        responses?: Array<{
          textAnnotations?: Array<{ description?: string }>;
          fullTextAnnotation?: { text?: string };
          error?: { message?: string };
        }>;
      };

      const annotation = visionData.responses?.[0];
      if (annotation?.error) {
        console.error("Vision annotation error:", annotation.error.message);
        return res.status(500).json({ error: annotation.error.message });
      }

      const fullText = annotation?.fullTextAnnotation?.text || annotation?.textAnnotations?.[0]?.description || "";
      console.log("OCR raw text length:", fullText.length, "chars");
      if (fullText.length > 0) {
        console.log("OCR first 200 chars:", fullText.substring(0, 200));
      }
      const parsed = parseReceiptText(fullText);
      console.log("Parsed result:", JSON.stringify({ merchantName: parsed.merchantName, items: parsed.lineItems.length, subtotal: parsed.subtotal, tax: parsed.tax, total: parsed.total }));

      return res.json(parsed);
    } catch (error) {
      console.error("OCR parse error:", error);
      return res.status(500).json({ error: "Failed to parse receipt" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

export function parseReceiptText(text: string): {
  merchantName: string;
  currency: string;
  lineItems: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
} {
  const rawLines = text.split("\n").map((l) => l.trim()).filter(Boolean);

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
    const pricePattern = /^[$€£¥₦₹₩₵]?\s*\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?\s*$/;
    const afterNextIsPrice = lineAfterNext && pricePattern.test(lineAfterNext);
    // Also check: next line is text-only and current line does NOT already end with a price
    const currentHasPrice = /\d+\.\d{2}\s*$/.test(line);

    if (hasText && !currentHasPrice && nextIsTextOnly && afterNextIsPrice) {
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

  // Currency-aware price pattern: handles "1,500.00", "250.00", "250", with optional currency before/after
  const currSym = `(?:[$€£¥₦₹₩₵]|R\\$|C\\$|A\\$|KSh|KES|NGN)?`;
  // Price: "1,500.00" or "500.00" or "250" — comma is thousands separator when followed by 3 digits
  const priceNum = `(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{1,2})?|\\d+\\.\\d{1,2}|\\d+)`;
  const priceOnlyPattern = new RegExp(`^${currSym}\\s*${priceNum}\\s*${currSym}\\s*$`);
  const priceAtEndPattern = new RegExp(`^(.+?)\\s+${currSym}\\s*${priceNum}\\s*${currSym}\\s*$`);
  // Quantity line: "2 x 380.00" or "3 @ 12.50"
  const qtyPricePattern = /^(\d+)\s*[xX@]\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+\.\d{1,2}|\d+)$/;
  const subtotalPattern = /sub\s*-?\s*total/i;
  const taxPattern = /\btax(?:es)?\b|\bhst\b|\bgst\b|\bpst\b|\bvat\b|\bctl\b/i;
  const totalPattern = /\btotal\b|\bamount\s*due\b|\bbalance\s*due\b/i;
  const tipPattern = /\btip\b|\bgratuity\b/i;

  const parsePrice = (s: string): number => {
    // Remove thousands commas, then parse
    return parseFloat(s.replace(/,/g, ""));
  };

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
      /[a-f0-9]{20,}/i,
      /^at\s+table\b/i,
      // Address lines: "City, ST 12345" or "123 Street Name"
      /^[A-Z][a-zA-Z\s]+,\s*[A-Z]{2}\s+\d{5}/,
      /^\d{1,5}\s+[A-Z][a-zA-Z\s]+(lane|st|street|ave|avenue|rd|road|blvd|dr|drive|way|ct|court|pl|place|circle|cir)\b/i,
      // "Test Receipt", "OCR App", etc.
      /\btest\s+receipt\b/i,
      /\bdining\s+with\b/i,
    ];
    return noisePatterns.some((p) => p.test(line));
  };

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
    const m = line.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+\.\d{1,2}|\d+)/);
    if (m) return parsePrice(m[1]);
    return null;
  };

  const cleanItemName = (name: string): { name: string; quantity: number } => {
    const qtyMatch = name.match(/^(\d+)\s*[xX@]\s*/);
    const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
    const cleaned = name
      .replace(/^\d+\s*[xX@]\s*/, "")
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

  console.log("[PARSER] Result:", JSON.stringify({ merchantName, currency, items: lineItems.length, subtotal, tax, total }));
  if (lineItems.length > 0) {
    console.log("[PARSER] Items:", JSON.stringify(lineItems));
  }

  return { merchantName, currency, lineItems, subtotal, tax, total };
}
