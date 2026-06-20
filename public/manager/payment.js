import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  collection, query, where, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

let paymentList = [];

onAuthStateChanged(auth, (user) => {
  if (!user) {
    location.href = "/manager/login.html";
    return;
  }

  loadPayments(user.uid);
});

// ⭐ 매니저 입금 조회
function loadPayments(uid) {
  const q = query(
    collection(db, "payments"),
    where("managerUid", "==", uid),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, (snap) => {
    paymentList = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    renderTable(paymentList);
  });
}

// ⭐ 테이블 렌더링
function renderTable(list) {
  const tbody = document.getElementById("paymentTableBody");
  tbody.innerHTML = "";

  list.forEach(item => {
    const tr = document.createElement("tr");

    const date = item.createdAt?.toDate
      ? item.createdAt.toDate().toLocaleDateString()
      : "-";

    tr.innerHTML = `
      <td>${item.customerName}</td>
      <td>${item.customerPhone}</td>
      <td>${item.contractCode || "-"}</td>
      <td>${item.amount ? item.amount.toLocaleString() + "원" : "-"}</td>
      <td>${date}</td>
      <td>${item.status || "-"}</td>
      <td>
        <button class="btn-secondary" onclick="openDetail('${item.id}')">관리</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// ⭐ 검색 + 필터
document.getElementById("searchInput").addEventListener("input", filterList);
document.getElementById("statusFilter").addEventListener("change", filterList);

function filterList() {
  const keyword = document.getElementById("searchInput").value.toLowerCase();
  const status = document.getElementById("statusFilter").value;

  const filtered = paymentList.filter(item => {
    const matchKeyword =
      (item.customerName || "").toLowerCase().includes(keyword) ||
      (item.customerPhone || "").toLowerCase().includes(keyword) ||
      (item.contractCode || "").toLowerCase().includes(keyword);

    const matchStatus =
      status === "all" || item.status === status;

    return matchKeyword && matchStatus;
  });

  renderTable(filtered);
}

// ⭐ 상세 페이지 이동
window.openDetail = function(id) {
  location.href = `/manager/payment-detail.html?id=${id}`;
};
