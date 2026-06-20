import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  doc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// URL에서 계약 ID 가져오기
const params = new URLSearchParams(location.search);
const contractId = params.get("id");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "/manager/login.html";
    return;
  }

  loadContractDetail();
});

// ⭐ 계약 상세 불러오기
async function loadContractDetail() {
  const ref = doc(db, "contracts", contractId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    alert("계약 정보를 찾을 수 없습니다.");
    return;
  }

  const data = snap.data();

  document.getElementById("customerName").textContent = data.customerName || "-";
  document.getElementById("customerPhone").textContent = data.customerPhone || "-";
  document.getElementById("contractCode").textContent = data.contractCode || "-";
  document.getElementById("amount").textContent = data.amount ? data.amount.toLocaleString() + "원" : "-";

  document.getElementById("statusSelect").value = data.status || "진행중";
  document.getElementById("memo").value = data.memo || "";
}

// ⭐ 저장하기
document.getElementById("saveBtn").addEventListener("click", async () => {
  const status = document.getElementById("statusSelect").value;
  const memo = document.getElementById("memo").value;

  const ref = doc(db, "contracts", contractId);

  await updateDoc(ref, {
    status,
    memo,
    updatedAt: new Date()
  });

  alert("저장되었습니다.");
});
