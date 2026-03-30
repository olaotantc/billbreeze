import { createWorker } from "tesseract.js";

/**
 * Run OCR on an image URI using Tesseract.js (web only).
 * Returns the full recognized text string.
 */
export async function recognizeTextWeb(imageUri: string): Promise<string> {
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(imageUri);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
