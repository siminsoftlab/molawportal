import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  doc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// URL에서 입금 ID 가져오기
const params = new URLSearchParams(location.search);
const paymentId = params.get("id");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "/manager/login.html";
    return;
  }

  loadPaymentDetail();
});

// ⭐ 입금 상세 불러오기
async function loadPaymentDetail() {
  const ref = doc(db, "payments", paymentId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    alert("입금 정보를 찾을 수 없습니다.");
    return;
  }

  const data = snap.data();

  document.getElementById("customerName").textContent = data.customerName || "-";
  document.getElementById("customerPhone").textContent = data.customerPhone || "-";
  document.getElementById("contractCode").textContent = data.contractCode || "-";

  document.getElementById("amount").value = data.amount || "";
  document.getElementById("paymentDate").value = data.paymentDate || "";
  document.getElementById("statusSelect").value = data.status || "입금대기";
  document.getElementById("memo").value = data.memo || "";
}

// ⭐ 저장하기
document.getElementById("saveBtn").addEventListener("click", async () => {
  const amount = Number(document.getElementById("amount").value);
  const paymentDate = document.getElementById("paymentDate").value;
  const status = document.getElementById("statusSelect").value;
  const memo = document.getElementById("memo").value;

  const ref = doc(db, "payments", paymentId);

  await updateDoc(ref, {
    amount,
    paymentDate,
    status,
    memo,
    updatedAt: new Date()
  });

  alert("저장되었습니다.");
});
