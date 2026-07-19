const { onRequest } = require("firebase-functions/v2/https");
const { DocumentProcessorServiceClient } = require("@google-cloud/documentai").v1beta3;
const functions = require("firebase-functions");

exports.docAI2 = functions.https.onRequest((req, res) => {
  console.log("TEMP 1ST GEN RESTORED");
  res.send("temp");
});


exports.docAI2 = onRequest(
  { timeoutSeconds: 300, memory: "1GiB" },
  async (req, res) => {

    // ⭐ Cloud Run(v2) CORS 설정 — 반드시 응답 최상단에서 실행
    res.set("Access-Control-Allow-Origin", "https://molawcalculator.com");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Max-Age", "3600");

    // ⭐ OPTIONS 프리플라이트 요청 처리
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

      // ⭐ 반드시 JSON 응답 전에 CORS 헤더가 살아 있어야 함
      return res.status(200).json(result);

    } catch (e) {
      console.error("docAI2 error:", e);
      return res.status(500).json({ error: e.message });
    }
  }
);

