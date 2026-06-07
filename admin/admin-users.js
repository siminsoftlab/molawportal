const db = firebase.firestore();

async function loadUsers() {
  const tbody = document.getElementById("userTableBody");
  tbody.innerHTML = "";

  const snap = await db.collection("users").orderBy("created_at", "desc").get();

  snap.forEach(doc => {
    const data = doc.data();
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${data.name || "-"}</td>
      <td>${data.email || "-"}</td>
      <td>${data.phone || "-"}</td>
      <td>${new Date(data.created_at).toLocaleString()}</td>
      <td>
        <button class="btn-secondary" onclick="viewUser('${doc.id}')">상세보기</button>
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
