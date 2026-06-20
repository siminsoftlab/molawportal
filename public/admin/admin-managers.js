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
            <button class="btn-secondary" onclick="editManager('${docSnap.id}', '${data.name}', '${data.email}')">수정</button>
            <button class="btn-danger" onclick="deleteManager('${docSnap.id}')">삭제</button>
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
