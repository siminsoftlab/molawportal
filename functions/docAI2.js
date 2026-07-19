const { onRequest } = require("firebase-functions/v2/https");
const { DocumentProcessorServiceClient } = require("@google-cloud/documentai").v1beta3;

exports.docAI2 = onRequest(
  { timeoutSeconds: 300, memory: "1GiB" },
  async (req, res) => {

    // ⭐ Cloud Run(v2) CORS 설정
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

      if (!base64) {
        return res.status(400).json({ error: "base64 is missing" });
      }

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

      // ⭐ 응답 크기 제한 해결: 전체 result를 반환하지 않고 필요한 부분만 반환
      const document = result.document;

      return res.status(200).json({
        text: document.text || "",
        entities: document.entities || [],
        pages: (document.pages || []).map(p => ({
          pageNumber: p.pageNumber,
          text: p.layout?.textAnchor?.content || ""
        }))
      });

    } catch (e) {
      console.error("docAI2 error:", e);
      return res.status(500).json({ error: e.message });
    }
  }
);
