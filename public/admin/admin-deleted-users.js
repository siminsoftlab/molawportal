import { db } from "/firebase-init.js";
import { collection, getDocs, orderBy, query } 
  from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

async function loadDeletedUsers() {
  const tbody = document.querySelector("#deletedTable tbody");
  const emptyMsg = document.getElementById("emptyMsg");

  const q = query(
    collection(db, "deleted_users"),
    orderBy("deleted_at", "desc")
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    emptyMsg.style.display = "block";
    return;
  }

  snap.forEach(docSnap => {
    const data = docSnap.data();

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${data.uid}</td>
      <td>${data.name || "-"}</td>
      <td>${data.email || "-"}</td>
      <td>${new Date(data.deleted_at).toLocaleString("ko-KR")}</td>
      <td>${data.payments?.length || 0}건</td>
      <td>${data.access_tokens?.length || 0}건</td>
      <td>${data.coupons?.length || 0}건</td>
    `;

    tbody.appendChild(tr);
  });
}

document.addEventListener("DOMContentLoaded", loadDeletedUsers);
