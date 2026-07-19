const { onRequest } = require("firebase-functions/v2/https");
const cors = require("cors");
const { DocumentProcessorServiceClient } = require("@google-cloud/documentai").v1beta3;

exports.docAI2 = onRequest(
  { timeoutSeconds: 300, memory: "1GiB" },
  async (req, res) => {
    cors({ origin: "https://molawcalculator.com" })(req, res, async () => {
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
    });
  }
);
