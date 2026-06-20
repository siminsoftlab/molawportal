import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  doc, getDoc,
  collection, query, where, orderBy, getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

let managerUid = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "/manager/login.html";
    return;
  }

  managerUid = user.uid;

  await loadManagerInfo();
  await loadConsultReport();
  await loadContractReport();
  await loadPaymentReport();
});

// ⭐ 매니저 기본 정보
async function loadManagerInfo() {
  const ref = doc(db, "users", managerUid);
  const snap = await getDoc(ref);

  const data = snap.data();

  document.getElementById("managerName").textContent = data.name;
  document.getElementById("managerEmail").textContent = data.email;
}

// ⭐ 월별 상담 수
async function loadConsultReport() {
  const q = query(
    collection(db, "consult_requests"),
    where("assignedTo", "==", managerUid),
    orderBy("createdAt", "asc")
  );

  const snap = await getDocs(q);

  const monthly = Array(12).fill(0);
  let total = 0;

  snap.forEach(docSnap => {
    const d = docSnap.data().createdAt?.toDate();
    if (!d) return;
    monthly[d.getMonth()]++;
    total++;
  });

  document.getElementById("totalConsult").textContent = total + "건";

  renderChart("consultChart", "월별 상담 수", monthly);
}

// ⭐ 월별 계약 수
async function loadContractReport() {
  const q = query(
    collection(db, "contracts"),
    where("managerUid", "==", managerUid),
    orderBy("createdAt", "asc")
  );

  const snap = await getDocs(q);

  const monthly = Array(12).fill(0);
  let total = 0;

  snap.forEach(docSnap => {
    const d = docSnap.data().createdAt?.toDate();
    if (!d) return;
    monthly[d.getMonth()]++;
    total++;
  });

  document.getElementById("totalContract").textContent = total + "건";

  renderChart("contractChart", "월별 계약 수", monthly);
}

// ⭐ 월별 입금액
async function loadPaymentReport() {
  const q = query(
    collection(db, "payments"),
    where("managerUid", "==", managerUid),
    orderBy("createdAt", "asc")
  );

  const snap = await getDocs(q);

  const monthly = Array(12).fill(0);
  let total = 0;

  snap.forEach(docSnap => {
    const data = docSnap.data();
    const d = data.createdAt?.toDate();
    if (!d) return;
    monthly[d.getMonth()] += data.amount || 0;
    total += data.amount || 0;
  });

  document.getElementById("totalPayment").textContent = total.toLocaleString() + "원";

  renderChart("paymentChart", "월별 입금액", monthly);
}

// ⭐ 차트 렌더링
function renderChart(canvasId, label, data) {
  new Chart(document.getElementById(canvasId), {
    type: "line",
    data: {
      labels: ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"],
      datasets: [{
        label,
        data,
        borderColor: "#4a6fff",
        backgroundColor: "rgba(74,111,255,0.2)",
        borderWidth: 2,
        fill: true,
        tension: 0.3
      }]
    }
  });
}
