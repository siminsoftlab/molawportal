const functions = require("firebase-functions");
const vision = require("@google-cloud/vision");

const client = new vision.ImageAnnotatorClient();

exports.visionOCR = functions.https.onRequest(async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      res.status(400).json({ error: "image(Base64) is required" });
      return;
    }

    const [result] = await client.textDetection({
      image: { content: image }
    });

    const detections = result.textAnnotations;
    const text = detections && detections.length ? detections[0].description : "";

    res.json({ text });
  } catch (e) {
    console.error("Vision OCR Error:", e);
    res.status(500).json({ error: e.message });
  }
});
