const functions = require("firebase-functions");
const admin = require("firebase-admin");
const webpush = require("web-push");
const nodemailer = require("nodemailer");
const axios = require("axios");

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
   4) 만료 3일 전 알림 (이메일 + Push)
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

    /* 이메일 발송 */
    await transporter.sendMail({
      from: "YOUR_EMAIL@gmail.com",
      to: user.email,
      subject: "📢 이용권 만료 3일 전 안내",
      html: emailTemplate(user.name)
    });

    /* Push 알림 발송 */
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

    /* Firestore에 발송 기록 저장 */
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
   5) 입금자명 자동 매칭 시스템
============================================================ */
exports.autoMatchDeposits = functions.firestore
  .document("bank_deposits/{depositId}")
  .onCreate(async (snap, context) => {

    const deposit = snap.data();
    const depositor = deposit.depositor_name.trim();

    // 1) PENDING 상태의 결제 중에서 입금자명 일치 검색
    const pendingSnap = await db.collection("payments")
      .where("status", "==", "PENDING")
      .where("depositor_name", "==", depositor)
      .get();

    if (pendingSnap.empty) {
      console.log("일치하는 결제 없음:", depositor);
      return null;
    }

    for (const doc of pendingSnap.docs) {
      const paymentId = doc.id;
      const payment = doc.data();

      // 2) 결제 승인 처리
      await db.collection("payments").doc(paymentId).update({
        status: "CONFIRMED",
        confirmed_at: Date.now()
      });

      // 3) 이용권 발급
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

      // 4) 자동 로그 생성
      await db.collection("payments")
        .doc(paymentId)
        .collection("logs")
        .add({
          message: `입금자명 자동 매칭으로 승인됨 (${depositor})`,
          admin: "자동 시스템",
          timestamp: Date.now()
        });

      // 5) bank_deposits에 matched 표시
      await snap.ref.update({
        matched: true,
        matched_payment_id: paymentId
      });

      console.log("자동 승인 완료:", paymentId);
    }

    return null;
  });

/* ============================================================
   6) 은행 API 자동 입금 수집 (오픈뱅킹)
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
          fintech_use_num: fintechUseNum,
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

        // Firestore 중복 체크
        const exists = await db.collection("bank_deposits")
          .where("timestamp", "==", timestamp)
          .where("amount", "==", amount)
          .get();

        if (!exists.empty) continue;

        // Firestore 저장 → autoMatchDeposits 자동 실행
        await db.collection("bank_deposits").add({
          depositor_name: depositor,
          amount: amount,
          timestamp: timestamp,
          matched: false
        });

        console.log("입금 내역 저장:", depositor, amount);
      }

    } catch (err) {
      console.error("은행 API 오류:", err);
    }

    return null;
  });
