import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

let managerUid = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    location.href = "/manager/login.html";
    return;
  }
  managerUid = user.uid;
});

// ⭐ 고객 생성
document.getElementById("saveBtn").addEventListener("click", async () => {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("email").value.trim();
  const memo = document.getElementById("memo").value.trim();

  if (!name || !phone) {
    alert("고객명과 연락처는 필수 입력 항목입니다.");
    return;
  }

  const ref = await addDoc(collection(db, "customers"), {
    name,
    phone,
    email,
    memo,
    managerUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  alert("고객이 생성되었습니다.");
  location.href = `/manager/customer-detail.html?id=${ref.id}`;
});
