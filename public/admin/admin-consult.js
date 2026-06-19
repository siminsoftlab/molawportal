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

  let consultList = [];
  let managerList = []; // 🔥 담당자 목록 저장

  /** 🔥 담당자 목록 불러오기 */
  async function loadManagers() {
    const snap = await getDocs(collection(db, "managers"));
    managerList = snap.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));
  }

  /** 🔥 실시간 상담 목록 로드 */
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

  /** 🔥 담당자 배정 (드롭다운) */
  window.assignManager = async function(id) {
    if (managerList.length === 0) {
      alert("담당자 목록이 없습니다.");
      return;
    }

    // 🔥 드롭다운 HTML 생성
    let options = managerList
      .map(m => `<option value="${m.uid}">${m.name} (${m.email})</option>`)
      .join("");

    const html = `
      <div>
        <label>담당자 선택:</label>
        <select id="managerSelect">${options}</select>
      </div>
    `;

    // 🔥 드롭다운을 prompt 대신 custom modal로 띄우기
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper);

    const selected = await new Promise(resolve => {
      const select = wrapper.querySelector("#managerSelect");
      select.addEventListener("change", () => resolve(select.value));
    });

    document.body.removeChild(wrapper);

    if (!selected) return;

    await updateDoc(doc(db, "consult_requests", id), {
      assignedTo: selected, // ⭐ 담당자 UID 저장
      status: "배정"
    });

    alert("담당자 배정 완료!");
  };

  /** 초기 실행 */
  loadManagers().then(loadConsultsRealtime);
});
