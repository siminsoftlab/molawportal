const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const axios = require("axios");
const fetch = require("node-fetch");
const cors = require("cors");

admin.initializeApp();
const db = admin.firestore();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "siminsoftlab@gmail.com",
    pass: "Lina8903!@"
  }
});

async function getValidFcmTokens(uid) {
  const snap = await db.collection(`users/${uid}/fcmTokens`).get();

  const valid = [];
  const invalid = [];

  snap.docs.forEach(doc => {
    const t = doc.data().token;
    if (typeof t === "string" && t.length > 20) valid.push(t);
    else invalid.push(doc.ref);
  });

  // 잘못된 토큰 자동 삭제
  for (const ref of invalid) await ref.delete();

  return valid;
}

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

      // 중복 발송 체크
      const alertDoc = await db.collection("notifications")
        .doc(userId)
        .collection("alerts")
        .doc("expire_3days")
        .get();

      if (alertDoc.exists) continue;

      // 사용자 정보
      const userDoc = await db.collection("users").doc(userId).get();
      const user = userDoc.data();

      // 이메일 발송
      await transporter.sendMail({
        from: "YOUR_EMAIL@gmail.com",
        to: user.email,
        subject: "📢 이용권 만료 3일 전 안내",
        html: `
          <h2>📢 이용권 만료 3일 전 안내</h2>
          <p>${user.name}님, 안녕하세요.</p>
          <p>이용 중인 이용권이 <strong>3일 후 만료</strong>됩니다.</p>
          <p><a href="https://molawcounter.com/payment.html">👉 이용권 연장하기</a></p>
        `
      });

      // ⭐ FCM 푸시 발송
      const tokens = await getValidFcmTokens(userId);

      if (tokens.length > 0) {
        await admin.messaging().sendMulticast({
          notification: {
            title: "이용권 만료 안내",
            body: "이용권 만료까지 3일 남았습니다."
          },
          tokens
        });
      }

      // 발송 기록
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

const ADMIN_UID = "eu6wUAEE4DeaHCqjA8KKNkw7Ung1";

exports.autoMatchDeposits = functions.firestore
  .document("bank_deposits/{depositId}")
  .onCreate(async (snap, context) => {
    const deposit = snap.data();
    const depositor = deposit.depositor_name.trim();

    const pendingSnap = await db.collection("payments")
      .where("status", "==", "PENDING")
      .where("depositor_name", "==", depositor)
      .get();

    // 자동 매칭 실패
    if (pendingSnap.empty) {
      await db.collection("match_failures").add({
        depositor_name: depositor,
        amount: deposit.amount,
        timestamp: deposit.timestamp,
        created_at: Date.now()
      });

      // 이메일 알림
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

      // ⭐ 관리자 FCM 푸시
      const tokens = await getValidFcmTokens(ADMIN_UID);

      if (tokens.length > 0) {
        await admin.messaging().sendMulticast({
          notification: {
            title: "⚠️ 자동 매칭 실패",
            body: `${depositor} / ${deposit.amount.toLocaleString()}원`
          },
          tokens
        });
      }

      return null;
    }

    // 자동 매칭 성공 (기존 로직 유지)
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

exports.sendPushToUser = functions.https.onCall(async (data, context) => {
  try {
    const { uid, title, body } = data;

    const tokens = await getValidFcmTokens(uid);

    if (tokens.length === 0) {
      return { success: false, message: "유효한 토큰 없음" };
    }

    const res = await admin.messaging().sendMulticast({
      notification: { title, body },
      tokens
    });

    return {
      success: true,
      sent: res.successCount,
      failed: res.failureCount
    };

  } catch (err) {
    console.error("sendPushToUser 오류:", err);
    throw new functions.https.HttpsError("internal", err.message);
  }
});
