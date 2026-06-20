import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { 
  collection, query, where, onSnapshot 
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

onAuthStateChanged(auth, (user) => {
  if (!user) {
    location.href = "/manager/login.html";
    return;
  }

  const uid = user.uid;

  loadConsultStats(uid);
  loadContractStats(uid);
  loadPaymentStats(uid);
});

// ⭐ 상담 통계
function loadConsultStats(uid) {
  const q = query(
    collection(db, "consult_requests"),
    where("assignedTo", "==", uid)
  );

  onSnapshot(q, (snap) => {
    const total = snap.size;
    document.getElementById("totalConsult").textContent = total + "건";

    const today = new Date().toISOString().slice(0, 10);
    const todayCount = snap.docs.filter(doc => {
      const d = doc.data().createdAt?.toDate();
      return d && d.toISOString().slice(0, 10) === today;
    }).length;

    document.getElementById("todayConsult").textContent = todayCount + "건";
  });
}

// ⭐ 계약 통계
function loadContractStats(uid) {
  const q = query(
    collection(db, "contracts"),
    where("managerUid", "==", uid)
  );

  onSnapshot(q, (snap) => {
    document.getElementById("contractCount").textContent = snap.size + "건";
  });
}

// ⭐ 입금 통계
function loadPaymentStats(uid) {
  const q = query(
    collection(db, "payments"),
    where("managerUid", "==", uid)
  );

  onSnapshot(q, (snap) => {
    document.getElementById("paymentCount").textContent = snap.size + "건";
  });
}

// 로그아웃
document.getElementById("logoutBtn").addEventListener("click", () => {
  signOut(auth);
});
