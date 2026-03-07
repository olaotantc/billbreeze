import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/ocr/parse", async (req: Request, res: Response) => {
    try {
      let { imageBase64 } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: "imageBase64 is required" });
      }

      if (imageBase64.includes(",")) {
        imageBase64 = imageBase64.split(",")[1];
      }
      imageBase64 = imageBase64.replace(/\s/g, "");

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

function parseReceiptText(text: string): {
  merchantName: string;
  lineItems: Array<{ name: string; price: number }>;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
} {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  let merchantName = lines[0] || "Unknown";
  const lineItems: Array<{ name: string; price: number }> = [];
  let subtotal: number | null = null;
  let tax: number | null = null;
  let total: number | null = null;

  const pricePatterns = [
    /\$\s*(\d+[.,]\d{2})\s*$/,
    /(\d+[.,]\d{2})\s*$/,
    /^\$?\s*(\d+[.,]\d{2})\s+/,
  ];
  const subtotalPattern = /sub\s*-?\s*total/i;
  const taxPattern = /\btax\b|\bhst\b|\bgst\b|\bpst\b|\bvat\b/i;
  const totalPattern = /\btotal\b|\bamount\s*due\b|\bbalance\s*due\b/i;
  const tipPattern = /\btip\b|\bgratuity\b/i;
  const discountPattern = /\bdiscount\b|\bsavings\b|\bcoupon\b|\bpromo\b/i;
  const skipPatterns = [
    /^(tel|phone|fax|address|www|http|date|time|order|check|table|server|cashier|card|visa|master|amex|debit|credit|change|balance\b(?!\s*due)|thank|receipt|welcome|store|guest|transaction|ref|auth|approved|member|loyalty|reward|points|earn)/i,
    /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/,
    /^\d{1,2}:\d{2}/,
    /^#\d+/,
    /^\*{3,}/,
    /^-{3,}/,
    /^={3,}/,
    /^\d{4,}/,
    /^x{4,}/i,
  ];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    if (skipPatterns.some((p) => p.test(line))) continue;
    if (discountPattern.test(line)) continue;

    let price: number | null = null;
    let name = "";

    for (const pattern of pricePatterns) {
      const match = line.match(pattern);
      if (match) {
        price = parseFloat(match[1].replace(",", "."));
        name = line.replace(pattern, "").replace(/\$/g, "").replace(/\s{2,}/g, " ").trim();
        break;
      }
    }

    if (price === null || price <= 0) continue;
    if (!name && !subtotalPattern.test(line) && !taxPattern.test(line) && !totalPattern.test(line)) continue;

    if (subtotalPattern.test(line)) {
      subtotal = price;
    } else if (taxPattern.test(line) && !tipPattern.test(line)) {
      tax = price;
    } else if (totalPattern.test(line)) {
      total = price;
    } else if (tipPattern.test(line)) {
      continue;
    } else if (name) {
      name = name.replace(/^\d+\s*[xX@]\s*/, "").replace(/\s*\d+\s*$/, "").trim();
      if (name.length > 1) {
        lineItems.push({ name, price });
      }
    }
  }

  return { merchantName, lineItems, subtotal, tax, total };
}
