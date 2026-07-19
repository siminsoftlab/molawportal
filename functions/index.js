// ===================== v2 Functions Only =====================
const { onRequest } = require("firebase-functions/v2/https");
const { DocumentProcessorServiceClient } = require("@google-cloud/documentai").v1;

// v1 함수들 불러오기
module.exports = {
  ...require("./v1"),
};

// ===================== Document AI — Cloud Functions v2 =====================
exports.docAI2 = onRequest(
  {
    cors: ["https://molawcalculator.com"],
  },
  async (req, res) => {
    try {
      const { base64 } = req.body;

      const client = new DocumentProcessorServiceClient();

      const name =
        "projects/989958208701/locations/us/processors/f9e461994ba2266a";

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
