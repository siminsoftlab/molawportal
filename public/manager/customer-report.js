import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  doc, getDoc,
  collection, query, where, orderBy, getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// URL에서 고객 ID 가져오기
const params = new URLSearchParams(location.search);
const customerId = params.get("id");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "/manager/login.html";
    return;
  }

  await loadCustomerInfo();
  await loadConsultReport();
  await loadContractReport();
  await loadPaymentReport();
});

// ⭐ 고객 기본 정보
async function loadCustomerInfo() {
  const ref = doc(db, "customers", customerId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const data = snap.data();

  document.getElementById("name").textContent = data.name;
  document.getElementById("phone").textContent = data.phone;
  document.getElementById("email").textContent = data.email || "-";
}

// ⭐ 월별 상담 수
async function loadConsultReport() {
  const q = query(
    collection(db, "consult_requests"),
    where("customerId", "==", customerId),
    orderBy("createdAt", "asc")
  );

  const snap = await getDocs(q);

  const monthly = Array(12).fill(0);

  snap.forEach(docSnap => {
    const d = docSnap.data().createdAt?.toDate();
    if (!d) return;
    monthly[d.getMonth()]++;
  });

  renderChart("consultChart", "월별 상담 수", monthly);
}

// ⭐ 월별 계약 수
async function loadContractReport() {
  const q = query(
    collection(db, "contracts"),
    where("customerId", "==", customerId),
    orderBy("createdAt", "asc")
  );

  const snap = await getDocs(q);

  const monthly = Array(12).fill(0);

  snap.forEach(docSnap => {
    const d = docSnap.data().createdAt?.toDate();
    if (!d) return;
    monthly[d.getMonth()]++;
  });

  renderChart("contractChart", "월별 계약 수", monthly);
}

// ⭐ 월별 입금액
async function loadPaymentReport() {
  const q = query(
    collection(db, "payments"),
    where("customerId", "==", customerId),
    orderBy("createdAt", "asc")
  );

  const snap = await getDocs(q);

  const monthly = Array(12).fill(0);

  snap.forEach(docSnap => {
    const data = docSnap.data();
    const d = data.createdAt?.toDate();
    if (!d) return;
    monthly[d.getMonth()] += data.amount || 0;
  });

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
