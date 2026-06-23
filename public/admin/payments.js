/* ============================================================
   Firebase v9 모듈식 API import (CDN)
============================================================ */
import { db } from "/firebase-init.js";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  updateDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/* ============================================================
   이용권 발급 함수 (기간 반영)
============================================================ */
async function issueToken(userId, months) {
  const now = Date.now();
  const expireDate = new Date();
  expireDate.setMonth(expireDate.getMonth() + months); // 정확히 월 단위로 계산
  const expire = expireDate.getTime();
  const token = crypto.randomUUID();

  await setDoc(doc(collection(db, "access_tokens"), token), {
    user_id: userId,
    token: token,
    type: `BANK_${months}M`,
    created_at: now,
    expire_at: expire,
    is_active: true
  });

  return token;
}

/* ============================================================
   결제내역 불러오기
============================================================ */
let allPayments = [];

async function loadPayments() {
  const list = document.getElementById("paymentList");
  const q = query(collection(db, "payments"), orderBy("created_at", "desc"));
  const snap = await getDocs(q);

  if (snap.empty) {
    list.innerHTML = "<p>결제내역이 없습니다.</p>";
    return;
  }

  allPayments = [];
  snap.forEach(docSnap => {
    allPayments.push({ id: docSnap.id, ...docSnap.data() });
  });

  renderPayments(allPayments);
}

/* ============================================================
   결제 리스트 렌더링
============================================================ */
function renderPayments(payments) {
  const list = document.getElementById("paymentList");
  let html = "";

  payments.forEach(p => {
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
        <p><strong>기간:</strong> ${p.period_months}개월</p>
        <p><strong>상태:</strong> <span class="status ${p.status}">${p.status}</span></p>
        <p><strong>신청일:</strong> ${created}</p>
        <p><strong>확인일:</strong> ${confirmed}</p>
        <button class="detail-btn" onclick="goDetail('${p.id}')">상세 보기</button>
    `;

    if (p.status === "PENDING") {
      html += `
        <button class="confirm-btn" onclick="confirmPayment('${p.id}', '${p.user_id}')">
          입금 확인
        </button>
      `;
    }

    html += `</div>`;
  });

  list.innerHTML = html;
}

/* ============================================================
   입금 확인 처리 (기간 반영)
============================================================ */
async function confirmPayment(paymentId, userId) {
  if (!confirm("입금 확인 처리하시겠습니까?")) return;

  const paymentDoc = await getDoc(doc(collection(db, "payments"), paymentId));
  const p = paymentDoc.data();

  await updateDoc(doc(collection(db, "payments"), paymentId), {
    status: "CONFIRMED",
    confirmed_at: Date.now()
  });

  // 결제 문서에 저장된 기간을 반영
  const months = p.period_months || 1; // 기본값 1개월
  await issueToken(userId, months);

  alert(`입금 확인 완료! ${months}개월 이용권이 발급되었습니다.`);
  loadPayments();
}

/* ============================================================
   상세 페이지 이동
============================================================ */
function goDetail(id) {
  window.location.href = `/admin/payment_detail.html?id=${id}`;
}

/* ============================================================
   전역 노출
============================================================ */
window.goDetail = goDetail;
window.confirmPayment = confirmPayment;

/* ============================================================
   실행
============================================================ */
loadPayments();

document.getElementById("backBtn").addEventListener("click", () => {
  window.location.href = "/admin.html";
});

/* ============================================================
   엑셀 다운로드 기능
============================================================ */
async function downloadExcel() {
  const q = query(collection(db, "payments"), orderBy("created_at", "desc"));
  const snap = await getDocs(q);

  if (snap.empty) {
    alert("다운로드할 결제내역이 없습니다.");
    return;
  }

  const rows = [];
  snap.forEach(docSnap => {
    const p = docSnap.data();
    rows.push({
      결제ID: docSnap.id,
      사용자ID: p.user_id,
      결제방법: p.method,
      금액: p.amount,
      입금자명: p.depositor_name,
      기간: p.period_months + "개월",
      상태: p.status,
      신청일: new Date(p.created_at).toLocaleString("ko-KR"),
      확인일: p.confirmed_at ? new Date(p.confirmed_at).toLocaleString("ko-KR") : "-"
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "결제내역");
  XLSX.writeFile(workbook, "결제내역.xlsx");
}

document.getElementById("excelBtn").addEventListener("click", downloadExcel);

/* ============================================================
   검색 이벤트
============================================================ */
document.getElementById("searchInput").addEventListener("input", (e) => {
  const keyword = e.target.value.trim().toLowerCase();
  if (keyword === "") {
    renderPayments(allPayments);
    return;
  }
  const filtered = allPayments.filter(p =>
    p.depositor_name.toLowerCase().includes(keyword)
  );
  renderPayments(filtered);
});
