const { onRequest } = require("firebase-functions/v2/https");
const { DocumentProcessorServiceClient } = require("@google-cloud/documentai").v1beta3;

const v1 = require("./v1");

const docAI2 = onRequest(
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

module.exports = {
  ...v1,
  docAI2,
};
