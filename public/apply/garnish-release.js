import { auth, db } from "/firebase-init.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("garnishForm");
  const statusEl = document.getElementById("submitStatus");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusEl.textContent = "신청을 처리 중입니다...";

    const fd = new FormData(form);
    const user = auth.currentUser;

    const data = {
      name: fd.get("name"),
      phone: fd.get("phone"),
      email: fd.get("email"),
      idNumber: fd.get("idNumber"),
      caseNumber: fd.get("caseNumber"),
      content: fd.get("content"),
      createdAt: serverTimestamp(),
      type: "채권압류해제",
      uid: user ? user.uid : null
    };

    try {
      await addDoc(collection(db, "garnish_release_applications"), data);
      statusEl.textContent = "신청이 성공적으로 접수되었습니다.";
      form.reset();
    } catch (err) {
      console.error(err);
      statusEl.textContent = "신청 중 오류가 발생했습니다.";
    }
  });
});
