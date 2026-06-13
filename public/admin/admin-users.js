/* ============================================================
   Firebase v9 모듈식 API import (CDN)
============================================================ */
import { db } from "/firebase-init.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

let allUsers = []; // ⭐ 전체 회원 저장 (검색용)

/* ============================================================
   회원 목록 불러오기
============================================================ */
async function loadUsers() {
  const tbody = document.getElementById("userTableBody");
  tbody.innerHTML = "";

  const snap = await getDocs(collection(db, "users"));

  allUsers = []; // 초기화

  snap.forEach(docSnap => {
    if (docSnap.id === "_schema") return; // ⭐ 스키마 제외
    allUsers.push({ id: docSnap.id, ...docSnap.data() });
  });

  // created_at 기준 정렬
  allUsers.sort((a, b) => b.created_at - a.created_at);

  renderTable(allUsers); // ⭐ 화면에 출력
}

/* ============================================================
   테이블 렌더링
============================================================ */
function renderTable(list) {
  const tbody = document.getElementById("userTableBody");
  tbody.innerHTML = "";

  list.forEach(user => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${user.name || "-"}</td>
      <td>${user.email || "-"}</td>
      <td>${user.phone || "-"}</td>
      <td>${new Date(user.created_at).toLocaleString()}</td>
      <td>
        <button class="btn-secondary" onclick="viewUser('${user.id}')">상세보기</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* ============================================================
   상세 페이지 이동
============================================================ */
function viewUser(uid) {
  location.href = `/admin/admin-user-detail.html?uid=${uid}`;
}

/* ============================================================
   전역 노출 (onclick에서 호출 가능하도록)
============================================================ */
window.viewUser = viewUser;

/* ============================================================
   실행 및 검색 이벤트
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  loadUsers(); // ⭐ 페이지 로드 시 자동 조회

  // ⭐ 검색 기능
  document.getElementById("searchInput").addEventListener("input", (e) => {
    const keyword = e.target.value.toLowerCase();

    const filtered = allUsers.filter(user =>
      (user.name || "").toLowerCase().includes(keyword) ||
      (user.email || "").toLowerCase().includes(keyword)
    );

    renderTable(filtered);
  });
});
