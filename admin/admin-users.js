const db = firebase.firestore();

async function loadUsers() {
  const tbody = document.getElementById("userTableBody");
  tbody.innerHTML = "";

  const snap = await db.collection("users").get();

  const users = [];

  snap.forEach(doc => {
    if (doc.id === "_schema") return; // ⭐ 스키마 제외
    users.push({ id: doc.id, ...doc.data() });
  });

  // created_at 기준 정렬
  users.sort((a, b) => b.created_at - a.created_at);

  users.forEach(user => {
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
  loadUsers();

  document.getElementById("searchInput").addEventListener("input", (e) => {
    const keyword = e.target.value.toLowerCase();
    const rows = document.querySelectorAll("#userTableBody tr");

    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(keyword) ? "" : "none";
    });
  });
});
