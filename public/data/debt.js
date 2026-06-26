import { db } from "/firebase-init.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// ⭐ 여기에 우리가 만든 채권자 전체 목록 넣으면 됨
import { creditors } from "/data/creditors.js"; // 또는 직접 배열로 작성

const tbody = document.querySelector("#creditorTable tbody");

function renderTable() {
  tbody.innerHTML = "";
  creditors.forEach(c => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${c.name}</td>
      <td>${c.account || "-"}</td>
      <td>${c.registeredAmount ?? "-"}</td>
      <td>${c.overdueAmount ?? "-"}</td>
      <td>${c.releaseReason || "-"}</td>
    `;

    tbody.appendChild(tr);
  });
}

renderTable();

document.getElementById("saveBtn").addEventListener("click", async () => {
  await addDoc(collection(db, "creditors"), {
    createdAt: new Date().toISOString(),
    creditors
  });
  alert("Firebase 저장 완료");
});
