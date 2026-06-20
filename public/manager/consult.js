import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  collection, query, where, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

let consultList = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "/manager/login.html";
    return;
  }

  loadConsults(user.uid);
});

// ⭐ 매니저 상담 조회
function loadConsults(uid) {
  const q = query(
    collection(db, "consult_requests"),
    where("assignedTo", "==", uid),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, (snap) => {
    consultList = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    renderTable(consultList);
  });
}

// ⭐ 테이블 렌더링
function renderTable(list) {
  const tbody = document.getElementById("consultTableBody");
  tbody.innerHTML = "";

  list.forEach(item => {
    const tr = document.createElement("tr");

    const date = item.createdAt?.toDate
      ? item.createdAt.toDate().toLocaleString()
      : "-";

    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${item.phone}</td>
      <td>${item.applyType || "-"}</td>
      <td>${date}</td>
      <td>${item.status || "-"}</td>
      <td>
        <button class="btn-secondary" onclick="openDetail('${item.id}')">관리</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// ⭐ 상세 페이지 이동
window.openDetail = function(id) {
  location.href = `/manager/consult-detail.html?id=${id}`;
};

// ⭐ 로그아웃
document.getElementById("logoutBtn").addEventListener("click", () => {
  signOut(auth);
});
