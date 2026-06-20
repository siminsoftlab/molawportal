import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  doc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

let paymentId = null;
let paymentData = null;

const params = new URLSearchParams(location.search);
paymentId = params.get("id");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "/manager/login.html";
    return;
  }

  await loadPayment();
});

// ⭐ 입금 정보 불러오기
async function loadPayment() {
  const ref = doc(db, "payments", paymentId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    alert("입금 정보를 찾을 수 없습니다.");
    history.back();
    return;
  }

  paymentData = snap.data();

  // 고객 정보
  const customerSnap = await getDoc(doc(db, "customers", paymentData.customerId));
  const customer = customerSnap.data();

  // 계약 정보
  const contractSnap = await getDoc(doc(db, "contracts", paymentData.contractId));
  const contract = contractSnap.data();

  document.getElementById("customerName").value = customer?.name || "-";
  document.getElementById("contractCode").value = contract?.contractCode || "-";

  document.getElementById("amount").value = paymentData.amount;
  document.getElementById("paymentDate").value = paymentData.paymentDate || "";
  document.getElementById("memo").value = paymentData.memo || "";
  document.getElementById("status").value = paymentData.status || "확인 필요";
}

// ⭐ 입금 수정 저장
document.getElementById("saveBtn").addEventListener("click", async () => {
  const amount = Number(document.getElementById("amount").value);
  const paymentDate = document.getElementById("paymentDate").value;
  const memo = document.getElementById("memo").value.trim();
  const status = document.getElementById("status").value;

  if (!amount || !paymentDate) {
    alert("필수 항목을 입력하세요.");
    return;
  }

  await updateDoc(doc(db, "payments", paymentId), {
    amount,
    paymentDate,
    memo,
    status,
    updatedAt: new Date()
  });

  alert("입금 정보가 수정되었습니다.");
  location.href = `/manager/payment-detail.html?id=${paymentId}`;
});
