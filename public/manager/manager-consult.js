import { db, auth } from "/firebase-init.js";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.getElementById("consultTableBody");
  const searchInput = document.getElementById("searchInput");

  let consultList = [];

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      alert("로그인이 필요합니다.");
      location.href = "/login.html";
      return;
    }

    // 🔥 로그인한 사용자 role 가져오기
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const role = userSnap.data()?.role || "none";

    console.log("로그인:", user.uid, "역할:", role);

    if (role === "admin") {
      loadAllConsults();        // ⭐ 관리자 → 전체 조회
    } else {
      loadMyConsults(user.uid); // ⭐ 담당자 → assignedTo 조회
    }
  });

  // ⭐ 관리자 전체 조회
  function loadAllConsults() {
    const q = query(
      collection(db, "consult_requests"),
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

  // ⭐ 담당자 본인 상담 조회
  function loadMyConsults(uid) {
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

  // 테이블 렌더링
  function renderTable(list) {
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

  // 검색 기능
  searchInput.addEventListener("input", () => {
    const keyword = searchInput.value.trim().toLowerCase();

    const filtered = consultList.filter(item =>
      (item.name || "").toLowerCase().includes(keyword) ||
      (item.phone || "").toLowerCase().includes(keyword) ||
      (item.email || "").toLowerCase().includes(keyword)
    );

    renderTable(filtered);
  });

  // 상세 페이지 이동
  window.openDetail = function(id) {
    location.href = `/admin/consult-detail.html?id=${id}`;
  };

  // 로그아웃
  document.getElementById("logout-btn").addEventListener("click", () => {
    auth.signOut();
  });
});
