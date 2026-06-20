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
  await loadGrowthReport();
});

// ⭐ 매니저 기본 정보
async function loadManagerInfo() {
  const ref = doc(db, "users", managerUid);
  const snap = await getDoc(ref);

  const data = snap.data() || {};

  document.getElementById("managerName").textContent = data.name || "-";
  document.getElementById("managerEmail").textContent = data.email || "-";
}

// ⭐ 성장 리포트 계산
async function loadGrowthReport() {
  const now = new Date();
  const year = now.getFullYear();

  const monthlyConsult = Array(12).fill(0);
  const monthlyContract = Array(12).fill(0);
  const monthlyPayment = Array(12).fill(0);

  // 상담
  const consultQ = query(
    collection(db, "consult_requests"),
    where("assignedTo", "==", managerUid)
  );
  const consultSnap = await getDocs(consultQ);
  consultSnap.forEach(d => {
    const t = d.data().createdAt?.toDate();
    if (!t || t.getFullYear() !== year) return;
    monthlyConsult[t.getMonth()]++;
  });

  // 계약
  const contractQ = query(
    collection(db, "contracts"),
    where("managerUid", "==", managerUid)
  );
  const contractSnap = await getDocs(contractQ);
  contractSnap.forEach(d => {
    const t = d.data().createdAt?.toDate();
    if (!t || t.getFullYear() !== year) return;
    monthlyContract[t.getMonth()]++;
  });

  // 입금
  const paymentQ = query(
    collection(db, "payments"),
    where("managerUid", "==", managerUid)
  );
  const paymentSnap = await getDocs(paymentQ);
  paymentSnap.forEach(d => {
    const t = d.data().createdAt?.toDate();
    if (!t || t.getFullYear() !== year) return;
    monthlyPayment[t.getMonth()] += d.data().amount || 0;
  });

  // ⭐ 전월 대비 성장률 계산
  const m = now.getMonth();
  const prev = m - 1;

  const consultGrowth = calcGrowth(monthlyConsult[prev], monthlyConsult[m]);
  const contractGrowth = calcGrowth(monthlyContract[prev], monthlyContract[m]);
  const paymentGrowth = calcGrowth(monthlyPayment[prev], monthlyPayment[m]);

  // 전환율 성장률
  const prevConversion = calcConversion(monthlyConsult[prev], monthlyContract[prev]);
  const nowConversion = calcConversion(monthlyConsult[m], monthlyContract[m]);
  const conversionGrowth = calcGrowth(prevConversion, nowConversion);

  document.getElementById("consultGrowth").textContent = consultGrowth + "%";
  document.getElementById("contractGrowth").textContent = contractGrowth + "%";
  document.getElementById("paymentGrowth").textContent = paymentGrowth + "%";
  document.getElementById("conversionGrowth").textContent = conversionGrowth + "%";

  // ⭐ 성장 점수 계산
  const growthScore =
    consultGrowth * 1 +
    contractGrowth * 2 +
    paymentGrowth * 0.01 +
    conversionGrowth * 3;

  document.getElementById("growthScore").textContent =
    Math.round(growthScore) + "점";

  // ⭐ 연간 그래프 렌더링
  renderGrowthChart(monthlyConsult, monthlyContract, monthlyPayment);
}

// 성장률 계산
function calcGrowth(prev, now) {
  if (prev === 0) return now > 0 ? 100 : 0;
  return Math.round(((now - prev) / prev) * 100);
}

// 전환율 계산
function calcConversion(consult, contract) {
  if (consult === 0) return 0;
  return Math.round((contract / consult) * 100);
}

// ⭐ 성장 그래프
function renderGrowthChart(consult, contract, payment) {
  new Chart(document.getElementById("growthChart"), {
    type: "line",
    data: {
      labels: ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"],
      datasets: [
        {
          label: "상담",
          data: consult,
          borderColor: "#4a6fff",
          backgroundColor: "rgba(74,111,255,0.2)",
          tension: 0.3
        },
        {
          label: "계약",
          data: contract,
          borderColor: "#ff7f50",
          backgroundColor: "rgba(255,127,80,0.2)",
          tension: 0.3
        },
        {
          label: "입금액",
          data: payment,
          borderColor: "#2ecc71",
          backgroundColor: "rgba(46,204,113,0.2)",
          tension: 0.3
        }
      ]
    }
  });
}
