import { db, auth } from "/firebase-init.js";
import {
  collection,
  doc,
  setDoc,
  getDocs
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
      `;

      tbody.appendChild(tr);
    });
  }

  loadManagers();

  // 로그아웃
  document.getElementById("logout-btn").addEventListener("click", () => {
    auth.signOut();
  });
});
