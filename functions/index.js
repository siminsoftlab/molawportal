// functions/index.js (FCM v1 전용 최종본)
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const fetch = require("node-fetch");
const { GoogleAuth } = require("google-auth-library");

admin.initializeApp();
const db = admin.firestore();

// 이메일 설정
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "siminsoftlab@gmail.com",
    pass: "Lina8903!@"
  }
});

// 관리자 UID (실제 값으로 교체)
const ADMIN_UID = "ADMIN_UID_여기에";

// 공통: 유효한 FCM 토큰만 가져오기
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

// FCM v1 액세스 토큰
async function getAccessToken() {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"]
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

// FCM v1으로 푸시 발송
async function sendFcmV1(tokens, title, body) {
  if (!tokens || tokens.length === 0) return;

  const accessToken = await getAccessToken();
  const projectId = process.env.GCLOUD_PROJECT;
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  for (const token of tokens) {
    const message = {
      message: {
        token,
        notification: { title, body }
      }
    };

    await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(message)
    });
  }
}

// 1) 관리자 페이지에서 호출하는 단일 사용자 푸시
exports.sendPushToUser = functions.https.onCall(async (data, context) => {
  try {
    const { uid, title, body } = data;

    if (!uid || !title || !body) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "uid, title, body는 필수입니다."
      );
    }

    const tokens = await getValidFcmTokens(uid);

    if (tokens.length === 0) {
      return { success: false, message: "유효한 토큰 없음" };
    }

    await sendFcmV1(tokens, title, body);

    return { success: true, sent: tokens.length };
  } catch (err) {
    console.error("sendPushToUser 오류:", err);
    throw new functions.https.HttpsError("internal", err.message);
  }
});

// 2) 이용권 만료 3일 전 알림 (이메일 + FCM)
exports.sendExpireAlerts = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async () => {
    const now = Date.now();
    const target = now + 3 * 24 * 60 * 60 * 1000;

    const snap = await db.collection("access_tokens")
      .where("expire_at", ">=", target - 3600000)
      .where("expire_at", "<=", target + 3600000)
      .get();

    for (const docSnap of snap.docs) {
      const token = docSnap.data();
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
        html: `
          <h2>📢 이용권 만료 3일 전 안내</h2>
          <p>${user.name}님, 안녕하세요.</p>
          <p>이용 중인 이용권이 <strong>3일 후 만료</strong>됩니다.</p>
          <p><a href="https://molawcalculator.com/mypage/mypage.html">👉 이용권 연장하기</a></p>
        `
      });

      const tokens = await getValidFcmTokens(userId);
      await sendFcmV1(tokens, "이용권 만료 안내", "이용권 만료까지 3일 남았습니다.");

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

// 3) 자동 매칭 실패 시 관리자에게 FCM 푸시
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

      const tokens = await getValidFcmTokens(ADMIN_UID);
      await sendFcmV1(
        tokens,
        "⚠️ 자동 매칭 실패",
        `${depositor} / ${deposit.amount.toLocaleString()}원`
      );

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
      const expire = now + 30 * 24 * 60 * 60 * 1000;

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
