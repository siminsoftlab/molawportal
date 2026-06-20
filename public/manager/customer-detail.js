import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  doc, getDoc, updateDoc,
  collection, query, where, orderBy, limit, getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// URL에서 고객 ID 가져오기
const params = new URLSearchParams(location.search);
const customerId = params.get("id");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "/manager/login.html";
    return;
  }

  loadCustomerDetail();
  loadRecentConsult();
  loadRecentContract();
  loadRecentPayment();
});

// ⭐ 고객 기본 정보 불러오기
async function loadCustomerDetail() {
  const ref = doc(db, "customers", customerId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    alert("고객 정보를 찾을 수 없습니다.");
    return;
  }

  const data = snap.data();

  document.getElementById("name").textContent = data.name || "-";
  document.getElementById("phone").textContent = data.phone || "-";
  document.getElementById("email").textContent = data.email || "-";
  document.getElementById("memo").value = data.memo || "";
}

// ⭐ 최근 상담
async function loadRecentConsult() {
  const q = query(
    collection(db, "consult_requests"),
    where("customerId", "==", customerId),
    orderBy("createdAt", "desc"),
    limit(1)
  );

  const snap = await getDocs(q);
  if (snap.empty) {
    document.getElementById("lastConsult").textContent = "-";
    return;
  }

  const data = snap.docs[0].data();
  document.getElementById("lastConsult").textContent =
    data.createdAt?.toDate().toLocaleDateString() || "-";
}

// ⭐ 최근 계약
async function loadRecentContract() {
  const q = query(
    collection(db, "contracts"),
    where("customerId", "==", customerId),
    orderBy("createdAt", "desc"),
    limit(1)
  );

  const snap = await getDocs(q);
  if (snap.empty) {
    document.getElementById("lastContract").textContent = "-";
    return;
  }

  const data = snap.docs[0].data();
  document.getElementById("lastContract").textContent =
    data.contractCode || "-";
}

// ⭐ 최근 입금
async function loadRecentPayment() {
  const q = query(
    collection(db, "payments"),
    where("customerId", "==", customerId),
    orderBy("createdAt", "desc"),
    limit(1)
  );

  const snap = await getDocs(q);
  if (snap.empty) {
    document.getElementById("lastPayment").textContent = "-";
    return;
  }

  const data = snap.docs[0].data();
  document.getElementById("lastPayment").textContent =
    (data.amount?.toLocaleString() || "0") + "원";
}

// ⭐ 저장하기
document.getElementById("saveBtn").addEventListener("click", async () => {
  const memo = document.getElementById("memo").value;

  const ref = doc(db, "customers", customerId);

  await updateDoc(ref, {
    memo,
    updatedAt: new Date()
  });

  alert("저장되었습니다.");
});

// ⭐ 고객 히스토리 페이지 이동
window.openHistory = function() {
  location.href = `/manager/customer-history.html?id=${customerId}`;
};
