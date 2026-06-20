import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  doc, getDoc,
  collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

let managerUid = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "/manager/login.html";
    return;
  }

  managerUid = user.uid;

  await loadManagerInfo();
  await calculateKPI();
});

// ⭐ 매니저 기본 정보
async function loadManagerInfo() {
  const ref = doc(db, "users", managerUid);
  const snap = await getDoc(ref);

  const data = snap.data() || {};

  document.getElementById("managerName").textContent = data.name || "-";
  document.getElementById("managerEmail").textContent = data.email || "-";
}

// ⭐ KPI 계산
async function calculateKPI() {
  // 상담: consult_requests.assignedTo == managerUid
  const consultQ = query(
    collection(db, "consult_requests"),
    where("assignedTo", "==", managerUid)
  );
  const consultSnap = await getDocs(consultQ);
  const totalConsult = consultSnap.size;

  // 계약: contracts.managerUid == managerUid
  const contractQ = query(
    collection(db, "contracts"),
    where("managerUid", "==", managerUid)
  );
  const contractSnap = await getDocs(contractQ);
  const totalContract = contractSnap.size;

  // 입금: payments.managerUid == managerUid
  const paymentQ = query(
    collection(db, "payments"),
    where("managerUid", "==", managerUid)
  );
  const paymentSnap = await getDocs(paymentQ);

  let totalPaymentAmount = 0;
  paymentSnap.forEach(d => {
    totalPaymentAmount += d.data().amount || 0;
  });

  // 평균 계약 금액
  let totalContractAmount = 0;
  contractSnap.forEach(d => {
    totalContractAmount += d.data().amount || 0;
  });

  const avgContractAmount = totalContract > 0
    ? Math.round(totalContractAmount / totalContract)
    : 0;

  const avgPaymentAmount = paymentSnap.size > 0
    ? Math.round(totalPaymentAmount / paymentSnap.size)
    : 0;

  // 전환율 계산
  const consultToContractRate =
    totalConsult > 0 ? Math.round((totalContract / totalConsult) * 100) : 0;

  const contractToPaymentRate =
    totalContract > 0 ? Math.round((paymentSnap.size / totalContract) * 100) : 0;

  // 화면 반영
  document.getElementById("totalConsult").textContent = totalConsult + "건";
  document.getElementById("totalContract").textContent = totalContract + "건";
  document.getElementById("totalPayment").textContent = totalPaymentAmount.toLocaleString() + "원";

  document.getElementById("consultToContractRate").textContent = consultToContractRate + "%";
  document.getElementById("contractToPaymentRate").textContent = contractToPaymentRate + "%";
  document.getElementById("avgContractAmount").textContent = avgContractAmount.toLocaleString() + "원";
  document.getElementById("avgPaymentAmount").textContent = avgPaymentAmount.toLocaleString() + "원";
}
