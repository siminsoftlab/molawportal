const { onRequest } = require("firebase-functions/v2/https");
const { DocumentProcessorServiceClient } = require("@google-cloud/documentai").v1beta3;

exports.docAI2 = onRequest(
  { timeoutSeconds: 300, memory: "1GiB" },
  async (req, res) => {

    // ⭐ Cloud Run(v2) 방식 CORS 처리
    res.set("Access-Control-Allow-Origin", "https://molawcalculator.com");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Max-Age", "3600");

    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    try {
      const { base64 } = req.body;

      const client = new DocumentProcessorServiceClient();
      const name = "projects/989958208701/locations/us/processors/f9e461994ba2266a";

      const request = {
        name,
        rawDocument: {
          content: base64,
          mimeType: "application/pdf",
        },
      };

      const [result] = await client.processDocument(request);

      res.status(200).json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
);
