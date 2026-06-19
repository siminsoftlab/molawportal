import { db } from "/firebase-init.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.getElementById("consultTableBody");
  const searchInput = document.getElementById("searchInput");

  let consultList = [];

  function loadConsultsRealtime() {
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
        <td>${item.status || "신규"}</td>
        <td>
          <button class="btn-primary" onclick="assignManager('${item.id}')">담당자 배정</button>
          <button class="btn-secondary" onclick="editConsult('${item.id}')">관리</button>
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
      (item.email || "").toLowerCase().includes(keyword) ||
      (item.applyType || "").toLowerCase().includes(keyword) ||
      (item.content || "").toLowerCase().includes(keyword)
    );

    renderTable(filtered);
  });

  // 상세 페이지 이동
  window.editConsult = function(id) {
    location.href = `/admin/consult-detail.html?id=${id}`;
  };

  // 담당자 배정
  window.assignManager = async function(id) {
    const name = prompt("담당자 이름을 입력하세요:");
    if (!name) return;

    await updateDoc(doc(db, "consult_requests", id), {
      manager: name,
      status: "배정"
    });

    alert("담당자 배정 완료!");
  };

  loadConsultsRealtime();
});
