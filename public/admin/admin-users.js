/* ============================================================
   Firebase v9 모듈식 API import (CDN)
============================================================ */
import { db, functions } from "/firebase-init.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

import { httpsCallable } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-functions.js";

let allUsers = []; // ⭐ 전체 회원 저장 (검색용)

/* ============================================================
   Cloud Functions 준비
============================================================ */
const setAdminRole = httpsCallable(functions, "setAdminRole");
const setManagerRole = httpsCallable(functions, "setManagerRole");

/* ============================================================
   회원 목록 불러오기
============================================================ */
async function loadUsers() {
  const tbody = document.getElementById("userTableBody");
  const roleBody = document.getElementById("roleTableBody");

  tbody.innerHTML = "";
  roleBody.innerHTML = "";

  const snap = await getDocs(collection(db, "users"));

  allUsers = [];

  snap.forEach(docSnap => {
    if (docSnap.id === "_schema") return;
    allUsers.push({ id: docSnap.id, ...docSnap.data() });
  });

  // created_at 기준 정렬
  allUsers.sort((a, b) => b.created_at - a.created_at);

  renderUserTable(allUsers);
  renderRoleTable(allUsers);
}

/* ============================================================
   1) 회원 목록 테이블 렌더링
============================================================ */
function renderUserTable(list) {
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
   2) 권한 관리 테이블 렌더링
============================================================ */
function renderRoleTable(list) {
  const tbody = document.getElementById("roleTableBody");
  tbody.innerHTML = "";

  list.forEach(user => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${user.name || "-"}</td>
      <td>${user.email || "-"}</td>
      <td>${user.id}</td>
      <td>${user.role || "없음"}</td>
      <td>
        <button class="btn-primary" onclick="makeAdmin('${user.id}')">관리자</button>
        <button class="btn-secondary" onclick="makeManager('${user.id}')">담당자</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* ============================================================
   3) 상세 페이지 이동
============================================================ */
function viewUser(uid) {
  location.href = `/admin/admin-user-detail.html?uid=${uid}`;
}

/* ============================================================
   4) 관리자 권한 부여
============================================================ */
window.makeAdmin = async function(uid) {
  if (!confirm("이 사용자를 관리자(admin)로 지정할까요?")) return;

  try {
    const result = await setAdminRole({ uid });
    alert(result.data.message);
    location.reload();
  } catch (err) {
    console.error(err);
    alert("권한 부여 실패");
  }
};

/* ============================================================
   5) 담당자 권한 부여
============================================================ */
window.makeManager = async function(uid) {
  if (!confirm("이 사용자를 담당자(manager)로 지정할까요?")) return;

  try {
    const result = await setManagerRole({ uid });
    alert(result.data.message);
    location.reload();
  } catch (err) {
    console.error(err);
    alert("권한 부여 실패");
  }
};

/* ============================================================
   전역 노출
============================================================ */
window.viewUser = viewUser;

/* ============================================================
   실행 및 검색 이벤트
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  loadUsers();

  document.getElementById("searchInput").addEventListener("input", (e) => {
    const keyword = e.target.value.toLowerCase();

    const filtered = allUsers.filter(user =>
      (user.name || "").toLowerCase().includes(keyword) ||
      (user.email || "").toLowerCase().includes(keyword)
    );

    renderUserTable(filtered);
    renderRoleTable(filtered);
  });
});
