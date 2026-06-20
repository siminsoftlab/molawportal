import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  collection, query, where, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

let customerList = [];

onAuthStateChanged(auth, (user) => {
  if (!user) {
    location.href = "/manager/login.html";
    return;
  }

  loadCustomers(user.uid);
});

// ⭐ 매니저 고객 조회
function loadCustomers(uid) {
  const q = query(
    collection(db, "customers"),
    where("managerUid", "==", uid),
    orderBy("updatedAt", "desc")
  );

  onSnapshot(q, (snap) => {
    customerList = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    renderTable(customerList);
  });
}

// ⭐ 테이블 렌더링
function renderTable(list) {
  const tbody = document.getElementById("customerTableBody");
  tbody.innerHTML = "";

  list.forEach(item => {
    const tr = document.createElement("tr");

    const lastDate = item.updatedAt?.toDate
      ? item.updatedAt.toDate().toLocaleDateString()
      : "-";

    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${item.phone}</td>
      <td>${item.email || "-"}</td>
      <td>${lastDate}</td>
      <td>
        <button class="btn-secondary" onclick="openDetail('${item.id}')">관리</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// ⭐ 검색 기능
document.getElementById("searchInput").addEventListener("input", () => {
  const keyword = document.getElementById("searchInput").value.toLowerCase();

  const filtered = customerList.filter(item =>
    (item.name || "").toLowerCase().includes(keyword) ||
    (item.phone || "").toLowerCase().includes(keyword) ||
    (item.email || "").toLowerCase().includes(keyword)
  );

  renderTable(filtered);
});

// ⭐ 상세 페이지 이동
window.openDetail = function(id) {
  location.href = `/manager/customer-detail.html?id=${id}`;
};
