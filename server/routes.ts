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
  lineItems: Array<{ name: string; price: number }>;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
} {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  let merchantName = "Unknown";
  const lineItems: Array<{ name: string; price: number }> = [];
  let subtotal: number | null = null;
  let tax: number | null = null;
  let total: number | null = null;

  const priceOnlyPattern = /^\$?\s*(\d+[.,]\d{2})\s*$/;
  const priceAtEndPattern = /^(.+?)\s+\$?\s*(\d+[.,]\d{2})\s*$/;
  const subtotalPattern = /sub\s*-?\s*total/i;
  const taxPattern = /\btax\b|\bhst\b|\bgst\b|\bpst\b|\bvat\b/i;
  const totalPattern = /\btotal\b|\bamount\s*due\b|\bbalance\s*due\b/i;
  const tipPattern = /\btip\b|\bgratuity\b/i;

  const isNoiseLine = (line: string): boolean => {
    const noisePatterns = [
      /^(tel|phone|fax|address|www|http|date|time|order|check|table|server|cashier|card|visa|master|amex|debit|credit|change|balance\b(?!\s*due)|thank|receipt|welcome|store|guest|transaction|ref|auth|approved|member|loyalty|reward|points|earn|share|ask anything|thinking|chat)/i,
      /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/,
      /^\d{1,2}:\d{2}/,
      /^#\d+/,
      /^\*{2,}/,
      /^-{3,}/,
      /^={3,}/,
      /^\d{4,}/,
      /^x{4,}/i,
      /\bdiscount\b|\bsavings\b|\bcoupon\b|\bpromo\b/i,
      /can make mistakes/i,
      /please come again/i,
      /bloomberg|forex|home \|/i,
      /[a-f0-9]{20,}/i,
    ];
    return noisePatterns.some((p) => p.test(line));
  };

  const isItemNameLine = (line: string): boolean => {
    if (isNoiseLine(line)) return false;
    if (priceOnlyPattern.test(line)) return false;
    if (/^\d+$/.test(line)) return false;
    if (line.length < 2) return false;
    const hasLetters = /[a-zA-Z]{2,}/.test(line);
    return hasLetters;
  };

  const extractPrice = (line: string): number | null => {
    const m = line.match(/\$?\s*(\d+[.,]\d{2})/);
    if (m) return parseFloat(m[1].replace(",", "."));
    return null;
  };

  const cleanItemName = (name: string): string => {
    return name
      .replace(/^\d+\s*[xX@]\s*/, "")
      .replace(/\$[\d.,]+/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  };

  let foundFirstItem = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isNoiseLine(line)) continue;

    const endMatch = line.match(priceAtEndPattern);
    if (endMatch) {
      foundFirstItem = true;
      const name = cleanItemName(endMatch[1]);
      const price = parseFloat(endMatch[2].replace(",", "."));
      if (price <= 0) continue;

      const combined = name + " " + line;
      if (subtotalPattern.test(combined)) { subtotal = price; }
      else if (taxPattern.test(combined) && !tipPattern.test(combined)) { tax = price; }
      else if (totalPattern.test(combined)) { total = price; }
      else if (tipPattern.test(combined)) { continue; }
      else if (name.length > 1) {
        lineItems.push({ name, price });
      }
      continue;
    }

    if (isItemNameLine(line)) {
      const isSummaryLabel = subtotalPattern.test(line) || taxPattern.test(line) || totalPattern.test(line) || tipPattern.test(line);

      const nextLine = i + 1 < lines.length ? lines[i + 1] : null;
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
          const name = cleanItemName(line);

          if (subtotalPattern.test(line)) { subtotal = price; }
          else if (taxPattern.test(line) && !tipPattern.test(line)) { tax = price; }
          else if (totalPattern.test(line)) { total = price; }
          else if (tipPattern.test(line)) { i++; continue; }
          else if (name.length > 1) {
            lineItems.push({ name, price });
          }
          i++;
          continue;
        }
      }

      if (!foundFirstItem && (merchantName === "Unknown")) {
        const isLikelyMerchant = /^[A-Z]/.test(line) && line.length > 2 && !priceOnlyPattern.test(line);
        if (isLikelyMerchant && !isSummaryLabel) {
          merchantName = line;
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

  console.log("[PARSER] Result:", JSON.stringify({ merchantName, items: lineItems.length, subtotal, tax, total }));
  if (lineItems.length > 0) {
    console.log("[PARSER] Items:", JSON.stringify(lineItems));
  }

  return { merchantName, lineItems, subtotal, tax, total };
}
