const functions = require("firebase-functions");
const admin = require("firebase-admin");
const webpush = require("web-push");
const nodemailer = require("nodemailer");

admin.initializeApp();
const db = admin.firestore();

/* ============================================================
   1) VAPID 키 설정 (Push 알림)
============================================================ */
webpush.setVapidDetails(
  "mailto:admin@molawcounter.com",
  "YOUR_PUBLIC_VAPID_KEY",
  "YOUR_PRIVATE_VAPID_KEY"
);

/* ============================================================
   2) 이메일 발송 설정 (Nodemailer)
============================================================ */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "YOUR_EMAIL@gmail.com",
    pass: "YOUR_APP_PASSWORD"
  }
});

/* ============================================================
   3) 이메일 템플릿
============================================================ */
function emailTemplate(name) {
  return `
    <h2>📢 이용권 만료 3일 전 안내</h2>
    <p>${name}님, 안녕하세요.</p>
    <p>이용 중인 개인회생 계산기 이용권이 <strong>3일 후 만료</strong>됩니다.</p>
    <p>계속 이용하시려면 아래 링크에서 연장해주세요.</p>
    <p><a href="https://molawcounter.com/payment.html">👉 이용권 연장하기</a></p>
    <br>
    <p>감사합니다.</p>
  `;
}

/* ============================================================
   4) 매일 실행되는 만료 3일 전 알림
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

    // 중복 발송 체크
    const alertDoc = await db.collection("notifications")
      .doc(userId)
      .collection("alerts")
      .doc("expire_3days")
      .get();

    if (alertDoc.exists) continue;

    // 사용자 정보 가져오기
    const userDoc = await db.collection("users").doc(userId).get();
    const user = userDoc.data();

    /* ============================================================
       4-1) 이메일 발송
    ============================================================ */
    await transporter.sendMail({
      from: "YOUR_EMAIL@gmail.com",
      to: user.email,
      subject: "📢 이용권 만료 3일 전 안내",
      html: emailTemplate(user.name)
    });

    /* ============================================================
       4-2) Push 알림 발송
    ============================================================ */
    const subDoc = await db.collection("push_subscriptions").doc(userId).get();
    if (subDoc.exists) {
      const subscription = subDoc.data().subscription;

      await webpush.sendNotification(
        subscription,
        JSON.stringify({
          title: "이용권 만료 안내",
          body: "이용권 만료까지 3일 남았습니다.",
          url: "/mypage/mypage.html"
        })
      );
    }

    /* ============================================================
       4-3) Firestore에 알림 기록 저장 (중복 방지)
    ============================================================ */
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
