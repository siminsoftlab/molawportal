const functions = require("firebase-functions");
const vision = require("@google-cloud/vision");

const client = new vision.ImageAnnotatorClient();

exports.visionOCR = functions.https.onRequest(async (req, res) => {
  // ============================
  // CORS 허용
  // ============================
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  // OPTIONS 요청 처리 (preflight)
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: "image(Base64) is required" });
    }

    const [result] = await client.textDetection({
      image: { content: image }
    });

    const detections = result.textAnnotations;
    const text =
      detections && detections.length ? detections[0].description : "";

    return res.json({ text });

  } catch (e) {
    console.error("Vision OCR Error:", e);
    return res.status(500).json({ error: e.message });
  }
});
