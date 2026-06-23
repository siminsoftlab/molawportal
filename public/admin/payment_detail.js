/* ============================================================
   Firebase v9 모듈식 API import (CDN)
============================================================ */
import { db } from "/firebase-init.js";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/* ============================================================
   URL 파라미터에서 paymentId 가져오기
============================================================ */
const urlParams = new URLSearchParams(window.location.search);
const paymentId = urlParams.get("id");

/* ============================================================
   이용권 발급 함수
============================================================ */
async function issueToken(userId, months) {
  const now = Date.now();

  // 정확한 월 단위 만료일 계산
  const expireDate = new Date();
  expireDate.setMonth(expireDate.getMonth() + months);
  const expire = expireDate.getTime();

  const token = crypto.randomUUID();

  await setDoc(doc(collection(db, "access_tokens"), token), {
    user_id: userId,
    token: token,
    type: `BANK_${months}M`,   // 예: BANK_36M
    created_at: now,
    expire_at: expire,
    is_active: true
  });

  return token;
}


/* ============================================================
   결제 상세 정보 불러오기
============================================================ */
async function loadPaymentDetail() {
  const paymentInfo = document.getElementById("paymentInfo");
  const userInfo = document.getElementById("userInfo");

  const paymentDoc = await getDoc(doc(collection(db, "payments"), paymentId));
  const p = paymentDoc.data();

  const created = new Date(p.created_at).toLocaleString("ko-KR");
  const confirmed = p.confirmed_at
    ? new Date(p.confirmed_at).toLocaleString("ko-KR")
    : "-";

  paymentInfo.innerHTML = `
    <p><strong>결제 ID:</strong> ${paymentId}</p>
    <p><strong>결제방법:</strong> ${p.method}</p>
    <p><strong>금액:</strong> ${p.amount.toLocaleString()}원</p>
    <p><strong>입금자명:</strong> ${p.depositor_name}</p>
    <p><strong>상태:</strong> ${p.status}</p>
    <p><strong>신청일:</strong> ${created}</p>
    <p><strong>확인일:</strong> ${confirmed}</p>
  `;

  /* 사용자 정보 */
  const userDoc = await getDoc(doc(collection(db, "users"), p.user_id));
  const user = userDoc.data();

  userInfo.innerHTML = `
    <p><strong>이름:</strong> ${user.name}</p>
    <p><strong>이메일:</strong> ${user.email}</p>
    <p><strong>가입일:</strong> ${new Date(user.created_at).toLocaleDateString("ko-KR")}</p>
  `;

  /* 버튼 상태 제어 */
  if (p.status !== "pending") {
    document.getElementById("confirmBtn").style.display = "none";
  }

  loadLogs();
}

/* ============================================================
   결제 로그 불러오기
============================================================ */
async function loadLogs() {
  const logBox = document.getElementById("logBox");

  const q = query(
    collection(db, "payments", paymentId, "logs"),
    orderBy("timestamp", "desc")
  );
  const snap = await getDocs(q);

  if (snap.empty) {
    logBox.innerHTML = "<p>로그가 없습니다.</p>";
    return;
  }

  let html = "";
  snap.forEach(docSnap => {
    const log = docSnap.data();
    const time = new Date(log.timestamp).toLocaleString("ko-KR");

    html += `
      <div class="log-item">
        <p><strong>${log.admin}</strong> (${time})</p>
        <p>${log.message}</p>
      </div>
    `;
  });

  logBox.innerHTML = html;
}

/* ============================================================
   관리자 메모(로그) 추가
============================================================ */
async function addLog() {
  const text = document.getElementById("logInput").value.trim();
  if (!text) return alert("메모를 입력해주세요.");

  await addDoc(collection(db, "payments", paymentId, "logs"), {
    message: text,
    admin: "관리자",
    timestamp: Date.now()
  });

  document.getElementById("logInput").value = "";
  loadLogs();
}

/* ============================================================
   입금 확인 처리
============================================================ */
async function confirmPayment() {
  if (!confirm("입금 확인 처리하시겠습니까?")) return;

  const paymentDoc = await getDoc(doc(collection(db, "payments"), paymentId));
  const p = paymentDoc.data();

  // 1) 결제 상태 업데이트
  await updateDoc(doc(collection(db, "payments"), paymentId), {
    status: "CONFIRMED",
    confirmed_at: Date.now()
  });

  // 2) 이용권 발급 (기간 반영)
  const months = p.period_months || 1;  // 기본값 1개월
  await issueToken(p.user_id, months);

  // 3) 자동 로그 생성
  await addDoc(collection(db, "payments", paymentId, "logs"), {
    message: `${months}개월 이용권 발급됨`,
    admin: "관리자",
    timestamp: Date.now()
  });

  alert(`${months}개월 이용권이 발급되었습니다.`);
  loadPaymentDetail();
}

/* ============================================================
   결제 취소 처리
============================================================ */
async function cancelPayment() {
  if (!confirm("정말 결제를 취소하시겠습니까?")) return;

  await updateDoc(doc(collection(db, "payments"), paymentId), {
    status: "CANCELED"
  });

  await addDoc(collection(db, "payments", paymentId, "logs"), {
    message: "결제 취소 처리됨",
    admin: "관리자",
    timestamp: Date.now()
  });

  alert("결제가 취소되었습니다.");
  loadPaymentDetail();
}

/* ============================================================
   이벤트 바인딩
============================================================ */
document.getElementById("addLogBtn").addEventListener("click", addLog);
document.getElementById("confirmBtn").addEventListener("click", confirmPayment);
document.getElementById("cancelBtn").addEventListener("click", cancelPayment);
document.getElementById("backBtn").addEventListener("click", () => {
  window.location.href = "/admin/payments.html";
});

/* ============================================================
   실행
============================================================ */
loadPaymentDetail();
