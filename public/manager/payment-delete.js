import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  doc, getDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const params = new URLSearchParams(location.search);
const paymentId = params.get("id");

let managerUid = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "/manager/login.html";
    return;
  }

  managerUid = user.uid;

  document.getElementById("deleteBtn").addEventListener("click", deletePayment);
});

// ⭐ 입금 삭제 기능
async function deletePayment() {
  const confirmDelete = confirm("정말 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.");

  if (!confirmDelete) return;

  const ref = doc(db, "payments", paymentId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    alert("입금 정보를 찾을 수 없습니다.");
    return;
  }

  const data = snap.data();

  // 본인 데이터인지 확인
  if (data.managerUid !== managerUid) {
    alert("본인이 등록한 입금만 삭제할 수 있습니다.");
    return;
  }

  await deleteDoc(ref);

  alert("입금이 삭제되었습니다.");
  location.href = "/manager/payment-list.html";
}
