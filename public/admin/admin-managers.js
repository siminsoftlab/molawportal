import { db, auth } from "/firebase-init.js";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const uidInput = document.getElementById("managerUid");
  const nameInput = document.getElementById("managerName");
  const emailInput = document.getElementById("managerEmail");
  const saveBtn = document.getElementById("saveManagerBtn");
  const tbody = document.getElementById("managerTableBody");

  const searchNameInput = document.getElementById("searchName");
  const searchUserBtn = document.getElementById("searchUserBtn");
  const searchResults = document.getElementById("searchResults");

  // 🔍 이름으로 회원 검색
  searchUserBtn.addEventListener("click", async () => {
    const name = searchNameInput.value.trim();
    if (!name) {
      alert("이름을 입력해주세요.");
      return;
    }

    const usersCol = collection(db, "users");
    const snap = await getDocs(usersCol);

    let results = [];

    snap.forEach(docSnap => {
      const data = docSnap.data();
      if (data.name && data.name.includes(name)) {
        results.push({
          uid: docSnap.id,
          name: data.name,
          email: data.email
        });
      }
    });

    if (results.length === 0) {
      searchResults.innerHTML = "<div>검색 결과가 없습니다.</div>";
      return;
    }

    // 검색 결과 테이블 생성
    let html = `
      <div><b>검색 결과 (${results.length}명)</b></div>
      <table class="admin-table" style="margin-top:10px;">
        <thead>
          <tr>
            <th>UID</th>
            <th>이름</th>
            <th>이메일</th>
            <th>선택</th>
          </tr>
        </thead>
        <tbody>
    `;

    results.forEach(user => {
      html += `
        <tr>
          <td>${user.uid}</td>
          <td>${user.name}</td>
          <td>${user.email}</td>
          <td>
            <button class="btn-secondary"
              onclick="selectUser('${user.uid}', '${user.name}', '${user.email}')">
              선택
            </button>
          </td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    searchResults.innerHTML = html;
  });

  // 선택 시 입력창 자동 채우기
  window.selectUser = function(uid, name, email) {
    uidInput.value = uid;
    nameInput.value = name;
    emailInput.value = email;

    alert("회원 정보를 불러왔습니다!");
  };

  // 🔥 담당자 등록
  saveBtn.addEventListener("click", async () => {
    const uid = uidInput.value.trim();
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();

    if (!uid || !name || !email) {
      alert("모든 정보를 입력해주세요.");
      return;
    }

    await setDoc(doc(db, "managers", uid), {
      name,
      email
    });

    alert("담당자 등록 완료!");
    loadManagers();
  });

  // 🔥 담당자 목록 불러오기
  async function loadManagers() {
    const snap = await getDocs(collection(db, "managers"));
    tbody.innerHTML = "";

    snap.forEach(docSnap => {
      const data = docSnap.data();
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${docSnap.id}</td>
        <td>${data.name}</td>
        <td>${data.email}</td>
        <td>
          <div class="manager-actions">
            <button class="btn-secondary"
              onclick="editManager('${docSnap.id}', '${data.name}', '${data.email}')">수정</button>
            <button class="btn-danger"
              onclick="deleteManager('${docSnap.id}')">삭제</button>
          </div>
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  loadManagers();

  // 🔥 담당자 삭제
  window.deleteManager = async function(uid) {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    await deleteDoc(doc(db, "managers", uid));
    alert("삭제 완료!");
    loadManagers();
  };

  // 🔥 담당자 수정
  window.editManager = async function(uid, name, email) {
    const newName = prompt("새 이름 입력:", name);
    if (!newName) return;

    const newEmail = prompt("새 이메일 입력:", email);
    if (!newEmail) return;

    await updateDoc(doc(db, "managers", uid), {
      name: newName,
      email: newEmail
    });

    alert("수정 완료!");
    loadManagers();
  };

  // 로그아웃
  document.getElementById("logout-btn").addEventListener("click", () => {
    auth.signOut();
  });
});
