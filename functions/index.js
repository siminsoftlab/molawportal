/* ============================================================
   Firebase Cloud Functions → Cloud Run(1st gen) 환경 최종본
   - Cloud Run은 cors() 미들웨어가 작동하지 않음
   - 반드시 직접 CORS 헤더를 붙여야 함
   - OPTIONS 프리플라이트도 직접 처리해야 함
============================================================ */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const axios = require("axios");
const { GoogleAuth } = require("google-auth-library");
const fetch = require("node-fetch");

admin.initializeApp();
const db = admin.firestore();

/* ============================================================
   이메일 설정
============================================================ */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "siminsoftlab@gmail.com",
    pass: "Lina8903!@"
  }
});

/* ============================================================
   이메일 템플릿
============================================================ */
function emailTemplate(name) {
  return `
    <h2>📢 이용권 만료 3일 전 안내</h2>
    <p>${name}님, 안녕하세요.</p>
    <p>이용 중인 개인회생 계산기 이용권이 <strong>3일 후 만료</strong>됩니다.</p>
    <p><a href="https://molawcalculator.com/payment.html">👉 이용권 연장하기</a></p>
  `;
}

/* ============================================================
   FCM v1 Access Token
============================================================ */
async function getAccessToken() {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"]
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

/* ============================================================
   FCM v1 발송 함수
============================================================ */
async function sendFcmV1(tokens, title, body, url) {
  if (!tokens || tokens.length === 0) return;

  const accessToken = await getAccessToken();
  const projectId = process.env.GCLOUD_PROJECT;
  const endpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  for (const token of tokens) {
    const message = {
      message: {
        token,
        notification: { title, body },
        data: { title, body, url }
      }
    };

    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(message)
    });
  }
}

/* ============================================================
   유효한 FCM 토큰만 가져오기
============================================================ */
async function getValidFcmTokens(uid) {
  const snap = await db.collection(`users/${uid}/fcmTokens`).get();

  const valid = [];
  const invalid = [];

  snap.docs.forEach(doc => {
    const t = doc.data().token;
    if (typeof t === "string" && t.length > 20) valid.push(t);
    else invalid.push(doc.ref);
  });

  for (const ref of invalid) await ref.delete();

  return valid;
}

/* ============================================================
   알림 저장
============================================================ */
async function saveNotification(uid, role, title, body, url) {
  const data = {
    title,
    body,
    url,
    createdAt: Date.now(),
    read: false
  };

  if (role === "user") {
    await db.collection(`users/${uid}/notifications`).add(data);
  } else if (role === "manager") {
    await db.collection(`managers/${uid}/notifications`).add(data);
  } else if (role === "admin") {
    await db.collection("admin_notifications").add(data);
  }
}

/* ============================================================
   1) 이용권 만료 3일 전 알림
============================================================ */
exports.sendExpireAlerts = functions.pubsub.schedule("every 24 hours").onRun(async () => {
  const now = Date.now();
  const target = now + (3 * 24 * 60 * 60 * 1000);

  const snap = await db.collection("access_tokens")
    .where("expire_at", ">=", target - 3600000)
    .where("expire_at", "<=", target + 3600000)
    .get();

  for (const doc of snap.docs) {
    const token = doc.data();
    const userId = token.user_id;

    const alertDoc = await db.collection("notifications")
      .doc(userId)
      .collection("alerts")
      .doc("expire_3days")
      .get();

    if (alertDoc.exists) continue;

    const userDoc = await db.collection("users").doc(userId).get();
    const user = userDoc.data();

    await transporter.sendMail({
      from: "YOUR_EMAIL@gmail.com",
      to: user.email,
      subject: "📢 이용권 만료 3일 전 안내",
      html: emailTemplate(user.name)
    });

    const title = "이용권 만료 안내";
    const body = "이용권 만료까지 3일 남았습니다.";
    const url = "/notifications.html";

    const tokens = await getValidFcmTokens(userId);
    await sendFcmV1(tokens, title, body, url);

    await saveNotification(userId, "user", title, body, url);

    await db.collection("notifications")
      .doc(userId)
      .collection("alerts")
      .doc("expire_3days")
      .set({
        sent: true,
        timestamp: Date.now()
      });
  }

  return null;
});

/* ============================================================
   2) 자동 매칭 시스템
============================================================ */
exports.autoMatchDeposits = functions.firestore
  .document("bank_deposits/{depositId}")
  .onCreate(async (snap, context) => {

    const deposit = snap.data();
    const depositor = deposit.depositor_name.trim();

    const pendingSnap = await db.collection("payments")
      .where("status", "==", "PENDING")
      .where("depositor_name", "==", depositor)
      .get();

    if (pendingSnap.empty) {
      await db.collection("match_failures").add({
        depositor_name: depositor,
        amount: deposit.amount,
        timestamp: deposit.timestamp,
        created_at: Date.now()
      });

      await transporter.sendMail({
        from: "YOUR_EMAIL@gmail.com",
        to: "ADMIN_EMAIL@gmail.com",
        subject: "⚠️ 자동 매칭 실패 알림",
        html: `
          <h2>⚠️ 자동 매칭 실패</h2>
          <p>입금자명: <strong>${depositor}</strong></p>
          <p>금액: <strong>${deposit.amount.toLocaleString()}원</strong></p>
        `
      });

      const title = "⚠️ 자동 매칭 실패";
      const body = `${depositor} / ${deposit.amount.toLocaleString()}원`;
      const url = "/notifications-managers.html";

      await saveNotification("ADMIN_UID", "manager", title, body, url);

      const adminTokens = await getValidFcmTokens("ADMIN_UID");
      await sendFcmV1(adminTokens, title, body, url);

      return null;
    }

    for (const doc of pendingSnap.docs) {
      const paymentId = doc.id;
      const payment = doc.data();

      await db.collection("payments").doc(paymentId).update({
        status: "CONFIRMED",
        confirmed_at: Date.now()
      });

      const tokenId = db.collection("access_tokens").doc().id;
      const now = Date.now();
      const expire = now + (30 * 24 * 60 * 60 * 1000);

      await db.collection("access_tokens").doc(tokenId).set({
        user_id: payment.user_id,
        token: tokenId,
        type: "BANK_30D",
        created_at: now,
        expire_at: expire,
        is_active: true
      });

      await db.collection("payments")
        .doc(paymentId)
        .collection("logs")
        .add({
          message: `입금자명 자동 매칭으로 승인됨 (${depositor})`,
          admin: "자동 시스템",
          timestamp: Date.now()
        });

      await snap.ref.update({
        matched: true,
        matched_payment_id: paymentId
      });
    }

    return null;
  });

/* ============================================================
   3) 오픈뱅킹 자동 입금 수집
============================================================ */
exports.fetchBankDeposits = functions.pubsub
  .schedule("every 5 minutes")
  .onRun(async () => {

    const accessToken = "OPENBANKING_ACCESS_TOKEN";
    const fintechUseNum = "YOUR_FINTECH_USE_NUM";

    try {
      const response = await axios.post(
        "https://openapi.openbanking.or.kr/v2.0/account/transaction_list",
        {
          bank_tran_id: "MOLAW" + Date.now(),
          fintech_use_num: fintechUse_num,
          inquiry_type: "A",
          inquiry_base: "D",
          from_date: "20240101",
          to_date: "20241231",
          sort_order: "D"
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          }
        }
      );

      const list = response.data.res_list;

      for (const item of list) {
        if (item.inout_type !== "입금") continue;

        const depositor = item.print_content.trim();
        const amount = Number(item.tran_amt);
        const timestamp = new Date(
          item.tran_date + " " + item.tran_time
        ).getTime();

        const exists = await db.collection("bank_deposits")
          .where("timestamp", "==", timestamp)
          .where("amount", "==", amount)
          .get();

        if (!exists.empty) continue;

        await db.collection("bank_deposits").add({
          depositor_name: depositor,
          amount: amount,
          timestamp: timestamp,
          matched: false
        });
      }

    } catch (err) {
      console.error("은행 API 오류:", err);
    }

    return null;
  });

/* ============================================================
   4) GeoIP API (Cloud Run용 CORS 적용)
============================================================ */
exports.geoip = functions.https.onRequest(async (req, res) => {

  res.set("Access-Control-Allow-Origin", "https://molawcalculator.com");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Max-Age", "3600");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.connection.remoteAddress;

    const geoRes = await fetch(`https://ipwho.is/${ip}`);
    const geoData = await geoRes.json();

    res.status(200).json({
      success: true,
      ip: ip,
      country: geoData.country,
      city: geoData.city
    });
  } catch (err) {
    console.error("GeoIP Error:", err);
    res.status(500).json({ success: false, error: err.toString() });
  }
});

/* ============================================================
   5) 관리자 권한 설정
============================================================ */
exports.setAdminRole = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "관리자만 권한을 변경할 수 있습니다."
    );
  }

  const uid = data.uid;

  await admin.auth().setCustomUserClaims(uid, { role: "admin" });

  await db.collection("users").doc(uid).set(
    {
      role: "admin",
      role_updated_at: Date.now()
    },
    { merge: true }
  );

  return { message: `관리자 권한이 부여되었습니다: ${uid}` };
});

/* ============================================================
   6) 담당자 권한 설정
============================================================ */
exports.setManagerRole = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "관리자만 권한을 변경할 수 있습니다."
    );
  }

  const uid = data.uid;

  await admin.auth().setCustomUserClaims(uid, { role: "manager" });

  await db.collection("users").doc(uid).set(
    {
      role: "manager",
      role_updated_at: Date.now()
    },
    { merge: true }
  );

  return { message: `담당자 권한이 부여되었습니다: ${uid}` };
});

/* ============================================================
   7) 관리자 → 특정 사용자에게 FCM v1 푸시 발송
============================================================ */
exports.sendPushToUser = functions.https.onCall(async (data, context) => {
  try {
    const { uid, title, body } = data;

    const tokens = await getValidFcmTokens(uid);

    if (tokens.length === 0) {
      return { success: false, message: "유효한 토큰 없음" };
    }

    const url = "/notifications.html";

    await sendFcmV1(tokens, title, body, url);
    await saveNotification(uid, "user", title, body, url);

    return { success: true, sent: tokens.length };
  } catch (err) {
    console.error("sendPushToUser 오류:", err);
    throw new functions.https.HttpsError("internal", err.message);
  }
});

/* ============================================================
   8) Document AI — Cloud Run 완전 대응 버전 (CORS + OPTIONS)
============================================================ */

exports.docAI = functions.https.onRequest(async (req, res) => {

  // ⭐ Cloud Run에서는 반드시 직접 CORS 헤더를 붙여야 한다
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
      return res.status(400).json({ 오류: "base64가 누락되었습니다" });
    }

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

    if (!docRes.ok) {
      const text = await docRes.text();
      return res.status(docRes.status).json({
        error: "Document AI error",
        status: docRes.status,
        message: text
      });
    }

    const result = await docRes.json();
    return res.status(200).json(result.document);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});
