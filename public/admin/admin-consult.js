import { db } from "/firebase-init.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.getElementById("consultTableBody");
  const searchInput = document.getElementById("searchInput");

  const modal = document.getElementById("managerModal");
  const managerSelect = document.getElementById("managerSelect");
  const btnConfirm = document.getElementById("assignConfirm");
  const btnCancel = document.getElementById("assignCancel");

  let consultList = [];
  let managerList = [];
  let selectedConsultId = null;

  /** 🔥 담당자 목록 불러오기 */
  async function loadManagers() {
    const snap = await getDocs(collection(db, "managers"));
    managerList = snap.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));
  }

  /** 🔥 상담 목록 실시간 로드 */
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

  /** 🔥 테이블 렌더링 */
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

  /** 🔍 검색 기능 */
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

  /** 🔗 상세 페이지 이동 */
  window.editConsult = function(id) {
    location.href = `/admin/consult-detail.html?id=${id}`;
  };

  /** 🔥 담당자 배정 버튼 클릭 */
  window.assignManager = function(id) {
    selectedConsultId = id;

    // 드롭다운 초기화
    managerSelect.innerHTML = managerList
      .map(m => `<option value="${m.uid}">${m.name} (${m.email})</option>`)
      .join("");

    modal.style.display = "flex";
  };

  /** 🔥 배정하기 버튼 */
  btnConfirm.addEventListener("click", async () => {
    const uid = managerSelect.value;

    await updateDoc(doc(db, "consult_requests", selectedConsultId), {
      assignedTo: uid,
      status: "배정"
    });

    modal.style.display = "none";
    alert("담당자 배정 완료!");
  });

  /** ❌ 취소 버튼 */
  btnCancel.addEventListener("click", () => {
    modal.style.display = "none";
  });

  /** 초기 실행 */
  loadManagers().then(loadConsultsRealtime);
});
