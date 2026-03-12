/**
 * Minimal Express server for Expo Go development only.
 * Proxies images to Google Cloud Vision API for OCR.
 * Not used in production — production uses on-device ML Kit.
 *
 * Usage: npm run server:dev
 * Requires: GOOGLE_CLOUD_VISION_API_KEY in .env
 */
import express from "express";
import { parseReceiptText } from "../lib/ocr-parser";

const app = express();
app.use(express.json({ limit: "10mb" }));

app.post("/api/ocr/parse", async (req, res) => {
  try {
    let { imageBase64 } = req.body;
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return res.status(400).json({ error: "imageBase64 is required" });
    }

    // Strip data URI prefix
    if (imageBase64.includes(",")) {
      imageBase64 = imageBase64.split(",")[1];
    }
    imageBase64 = imageBase64.replace(/\s/g, "");

    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GOOGLE_CLOUD_VISION_API_KEY not set in .env" });
    }

    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [{
            image: { content: imageBase64 },
            features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }],
          }],
        }),
      }
    );

    if (!visionResponse.ok) {
      console.error("Vision API error:", visionResponse.status);
      return res.status(500).json({ error: "OCR service error" });
    }

    const visionData = await visionResponse.json() as any;
    const annotation = visionData.responses?.[0];
    const fullText = annotation?.fullTextAnnotation?.text || annotation?.textAnnotations?.[0]?.description || "";

    console.log("[OCR RAW TEXT] ─────────────────────────");
    console.log(fullText);
    console.log("─────────────────────────────────────────");

    const parsed = parseReceiptText(fullText);

    console.log("[OCR PARSED] ───────────────────────────");
    console.log(JSON.stringify(parsed, null, 2));
    console.log("─────────────────────────────────────────");

    return res.json(parsed);
  } catch (error) {
    console.error("OCR parse error:", error);
    return res.status(500).json({ error: "Failed to parse receipt" });
  }
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`[DEV] OCR server running on http://localhost:${PORT}`);
  console.log("[DEV] This server is for Expo Go testing only. Production uses on-device ML Kit.");
});
