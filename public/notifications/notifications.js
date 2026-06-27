// notifications.js
import { app, db, auth } from "/firebase-init.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    document.getElementById("list").innerHTML = "로그인이 필요합니다.";
    return;
  }

  const listEl = document.getElementById("list");

  const q = query(
    collection(db, `users/${user.uid}/notifications`),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, (snap) => {
    if (snap.empty) {
      listEl.innerHTML = "알림이 없습니다.";
      return;
    }

    listEl.innerHTML = "";

    snap.forEach((doc) => {
      const n = doc.data();

      const item = document.createElement("div");
      item.className = "noti-item";
      item.innerHTML = `
        <h3>${n.title}</h3>
        <p>${n.body}</p>
        <small>${new Date(n.createdAt).toLocaleString()}</small>
      `;

      item.addEventListener("click", () => {
        if (n.url) location.href = n.url;
      });

      listEl.appendChild(item);
    });
  });
});
