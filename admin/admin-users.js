const db = firebase.firestore();

let allUsers = []; // ⭐ 전체 회원 저장 (검색용)

async function loadUsers() {
  const tbody = document.getElementById("userTableBody");
  tbody.innerHTML = "";

  const snap = await db.collection("users").get();

  allUsers = []; // 초기화

  snap.forEach(doc => {
    if (doc.id === "_schema") return; // ⭐ 스키마 제외
    allUsers.push({ id: doc.id, ...doc.data() });
  });

  // created_at 기준 정렬
  allUsers.sort((a, b) => b.created_at - a.created_at);

  renderTable(allUsers); // ⭐ 화면에 출력
}

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

function viewUser(uid) {
  location.href = `admin-user-detail.html?uid=${uid}`;
}

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
