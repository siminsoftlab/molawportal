import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  collection, query, where, orderBy, getDocs, doc, getDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

let managerUid = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "/manager/login.html";
    return;
  }

  managerUid = user.uid;

  await loadPayments();
});

// ⭐ 입금 목록 불러오기
async function loadPayments() {
  const q = query(
    collection(db, "payments"),
    where("managerUid", "==", managerUid),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);
  const tbody = document.getElementById("paymentTableBody");
  tbody.innerHTML = "";

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const paymentId = docSnap.id;

    const customer = await getCustomer(data.customerId);
    const contract = await getContract(data.contractId);

    const tr = document.createElement("tr");

    const date = data.paymentDate
      ? new Date(data.paymentDate).toLocaleDateString()
      : "-";

    tr.innerHTML = `
      <td>${customer?.name || "-"}</td>
      <td>${contract?.contractCode || "-"}</td>
      <td>${(data.amount || 0).toLocaleString()}원</td>
      <td>${date}</td>
      <td>${data.status || "확인 필요"}</td>
      <td>
        <button class="btn-small" onclick="openPayment('${paymentId}')">보기</button>
      </td>
    `;

    tbody.appendChild(tr);
  }
}

// ⭐ 고객 정보 가져오기
async function getCustomer(id) {
  if (!id) return null;
  const snap = await getDoc(doc(db, "customers", id));
  return snap.exists() ? snap.data() : null;
}

// ⭐ 계약 정보 가져오기
async function getContract(id) {
  if (!id) return null;
  const snap = await getDoc(doc(db, "contracts", id));
  return snap.exists() ? snap.data() : null;
}

// ⭐ 상세 페이지 이동
window.openPayment = function(id) {
  location.href = `/manager/payment-detail.html?id=${id}`;
};
