import express from "express";
import { GoogleAuth } from "google-auth-library";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "50mb" }));

app.post("/docAI", async (req, res) => {
  res.set("Access-Control-Allow-Origin", "https://molawcalculator.com");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Max-Age", "3600");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  try {
    const { base64 } = req.body;

    const PROJECT_ID = "989958208701";
    const PROCESSOR_ID = "f9e461994ba2266a";
    const LOCATION = "us";

    const endpoint =
      `https://${LOCATION}-documentai.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/processors/${PROCESSOR_ID}:process`;

    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"]
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const docRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken.token || accessToken}`
      },
      body: JSON.stringify({
        rawDocument: {
          content: base64,
          mimeType: "application/pdf"
        }
      })
    });

    const result = await docRes.json();
    return res.status(200).json(result.document);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.listen(8080, () => console.log("docAI Cloud Run server running"));
