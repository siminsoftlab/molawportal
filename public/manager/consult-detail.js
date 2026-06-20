import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  doc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// URL에서 상담 ID 가져오기
const params = new URLSearchParams(location.search);
const consultId = params.get("id");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "/manager/login.html";
    return;
  }

  loadConsultDetail();
});

// ⭐ 상담 상세 불러오기
async function loadConsultDetail() {
  const ref = doc(db, "consult_requests", consultId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    alert("상담 정보를 찾을 수 없습니다.");
    return;
  }

  const data = snap.data();

  document.getElementById("name").textContent = data.name || "-";
  document.getElementById("phone").textContent = data.phone || "-";
  document.getElementById("email").textContent = data.email || "-";
  document.getElementById("applyType").textContent = data.applyType || "-";
  document.getElementById("content").textContent = data.content || "-";

  document.getElementById("statusSelect").value = data.status || "배정";
  document.getElementById("memo").value = data.memo || "";
}

// ⭐ 저장하기
document.getElementById("saveBtn").addEventListener("click", async () => {
  const status = document.getElementById("statusSelect").value;
  const memo = document.getElementById("memo").value;

  const ref = doc(db, "consult_requests", consultId);

  await updateDoc(ref, {
    status,
    memo,
    updatedAt: new Date()
  });

  alert("저장되었습니다.");
});
