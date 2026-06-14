// admin-consult.js
import { db } from "/firebase-init.js";
import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  const tbody = document.getElementById("consultTableBody");
  const searchInput = document.getElementById("searchInput");

  let consultList = [];

  async function loadConsults() {
    const q = query(
      collection(db, "consult_requests"),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);

    consultList = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    renderTable(consultList);
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
      <td>${item.email}</td>
      <td>${item.applyType || "-"}</td>
      <td style="max-width:200px; white-space:normal;">${item.content || "-"}</td>
      <td>${date}</td>
      <td>${item.status || "신규"}</td>
      <td>
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
      item.name.toLowerCase().includes(keyword) ||
      item.phone.toLowerCase().includes(keyword) ||
      item.email.toLowerCase().includes(keyword) ||
      item.type.toLowerCase().includes(keyword)
    );

    renderTable(filtered);
  });

  // 관리 버튼 클릭 시 (추후 상세 관리 페이지 연결 가능)
  window.editConsult = function(id) {
    location.href = `/admin/consult-detail.html?id=${id}`;
  };

  // 최초 로드
  loadConsults();
});
