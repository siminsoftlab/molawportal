/* ============================================================
   Firebase 초기화
============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyACfN4_r2hUAn1NQPWRZzpegjyIESYGK3I",
  authDomain: "molawcounter.firebaseapp.com",
  projectId: "molawcounter",
  storageBucket: "molawcounter.firebasestorage.app",
  messagingSenderId: "989958208701",
  appId: "1:989958208701:web:16bd53eed95276f5d4cbd4",
  measurementId: "G-D4W34NBWKT"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* ============================================================
   이용권 발급 함수
============================================================ */
async function issueToken(userId) {
  const now = Date.now();
  const expire = now + (30 * 24 * 60 * 60 * 1000);
  const token = crypto.randomUUID();

  await db.collection("access_tokens").doc(token).set({
    user_id: userId,
    token: token,
    type: "BANK_30D",
    created_at: now,
    expire_at: expire,
    is_active: true
  });

  return token;
}

/* ============================================================
   결제내역 불러오기
============================================================ */
async function loadPayments() {
  const list = document.getElementById("paymentList");

  const snap = await db.collection("payments")
    .orderBy("created_at", "desc")
    .get();

  if (snap.empty) {
    list.innerHTML = "<p>결제내역이 없습니다.</p>";
    return;
  }

  let html = "";

  for (const doc of snap.docs) {
    const p = doc.data();
    const id = doc.id;

    const created = new Date(p.created_at).toLocaleString("ko-KR");
    const confirmed = p.confirmed_at
      ? new Date(p.confirmed_at).toLocaleString("ko-KR")
      : "-";

    html += `
      <div class="item">
        <p><strong>사용자 ID:</strong> ${p.user_id}</p>
        <p><strong>결제방법:</strong> ${p.method}</p>
        <p><strong>금액:</strong> ${p.amount.toLocaleString()}원</p>
        <p><strong>입금자명:</strong> ${p.depositor_name}</p>
        <p><strong>상태:</strong> <span class="status ${p.status}">${p.status}</span></p>
        <p><strong>신청일:</strong> ${created}</p>
        <p><strong>확인일:</strong> ${confirmed}</p>
    `;

    if (p.status === "PENDING") {
      html += `
        <button class="confirm-btn" onclick="confirmPayment('${id}', '${p.user_id}')">
          입금 확인
        </button>
      `;
    }

    html += `</div>`;
  }

  list.innerHTML = html;
}

/* ============================================================
   입금 확인 처리
============================================================ */
async function confirmPayment(paymentId, userId) {
  if (!confirm("입금 확인 처리하시겠습니까?")) return;

  // 1) 결제 상태 업데이트
  await db.collection("payments").doc(paymentId).update({
    status: "CONFIRMED",
    confirmed_at: Date.now()
  });

  // 2) 이용권 발급
  await issueToken(userId);

  alert("입금 확인 완료! 이용권이 발급되었습니다.");

  // 3) 목록 새로고침
  loadPayments();
}

/* ============================================================
   실행
============================================================ */
loadPayments();

document.getElementById("backBtn").addEventListener("click", () => {
  window.location.href = "/admin/index.html";
});
/* ============================================================
   엑셀 다운로드 기능
============================================================ */
async function downloadExcel() {
  const snap = await db.collection("payments")
    .orderBy("created_at", "desc")
    .get();

  if (snap.empty) {
    alert("다운로드할 결제내역이 없습니다.");
    return;
  }

  const rows = [];

  snap.forEach(doc => {
    const p = doc.data();

    rows.push({
      결제ID: doc.id,
      사용자ID: p.user_id,
      결제방법: p.method,
      금액: p.amount,
      입금자명: p.depositor_name,
      상태: p.status,
      신청일: new Date(p.created_at).toLocaleString("ko-KR"),
      확인일: p.confirmed_at
        ? new Date(p.confirmed_at).toLocaleString("ko-KR")
        : "-"
    });
  });

  // 워크시트 생성
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // 워크북 생성
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "결제내역");

  // 파일 다운로드
  XLSX.writeFile(workbook, "결제내역.xlsx");
}

/* ============================================================
   버튼 이벤트
============================================================ */
document.getElementById("excelBtn").addEventListener("click", downloadExcel);
