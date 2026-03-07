import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/ocr/parse", async (req: Request, res: Response) => {
    try {
      const { imageBase64 } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: "imageBase64 is required" });
      }

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
                features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
              },
            ],
          }),
        }
      );

      if (!visionResponse.ok) {
        const errorText = await visionResponse.text();
        console.error("Vision API error:", errorText);
        return res.status(500).json({ error: "OCR service error" });
      }

      const visionData = await visionResponse.json() as {
        responses?: Array<{
          textAnnotations?: Array<{ description?: string }>;
          error?: { message?: string };
        }>;
      };

      const annotation = visionData.responses?.[0];
      if (annotation?.error) {
        return res.status(500).json({ error: annotation.error.message });
      }

      const fullText = annotation?.textAnnotations?.[0]?.description || "";
      const parsed = parseReceiptText(fullText);

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

  const pricePattern = /\$?\s*(\d+[.,]\d{2})\s*$/;
  const subtotalPattern = /sub\s*total/i;
  const taxPattern = /\btax\b/i;
  const totalPattern = /\btotal\b/i;
  const tipPattern = /\btip\b|\bgratuity\b/i;
  const skipPatterns = [
    /^(tel|phone|fax|address|www|http|date|time|order|check|table|server|cashier|card|visa|master|amex|debit|credit|change|balance|thank|receipt)/i,
    /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/,
    /^\d{1,2}:\d{2}/,
    /^#\d+/,
    /^\*{3,}/,
    /^-{3,}/,
    /^={3,}/,
  ];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    if (skipPatterns.some((p) => p.test(line))) continue;

    const priceMatch = line.match(pricePattern);
    if (!priceMatch) continue;

    const price = parseFloat(priceMatch[1].replace(",", "."));
    const name = line.replace(pricePattern, "").replace(/\$/, "").trim();

    if (!name || price <= 0) continue;

    if (subtotalPattern.test(line)) {
      subtotal = price;
    } else if (taxPattern.test(line) && !tipPattern.test(line)) {
      tax = price;
    } else if (totalPattern.test(line)) {
      total = price;
    } else if (tipPattern.test(line)) {
      continue;
    } else {
      lineItems.push({ name, price });
    }
  }

  return { merchantName, lineItems, subtotal, tax, total };
}
