import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  collection, query, where, orderBy, getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

let managerUid = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "/manager/login.html";
    return;
  }

  managerUid = user.uid;

  await loadPaymentStats();
});

// ⭐ 입금 통계 불러오기
async function loadPaymentStats() {
  const q = query(
    collection(db, "payments"),
    where("managerUid", "==", managerUid),
    orderBy("createdAt", "asc")
  );

  const snap = await getDocs(q);

  const monthlyAmount = Array(12).fill(0);
  const monthlyCount = Array(12).fill(0);
  const yearlyAmount = {};

  let total = 0;
  let maxPayment = 0;
  let count = 0;

  snap.forEach(docSnap => {
    const data = docSnap.data();
    const date = data.paymentDate ? new Date(data.paymentDate) : null;
    if (!date) return;

    const month = date.getMonth();
    const year = date.getFullYear();

    const amount = data.amount || 0;

    // 월별
    monthlyAmount[month] += amount;
    monthlyCount[month]++;

    // 연도별
    if (!yearlyAmount[year]) yearlyAmount[year] = 0;
    yearlyAmount[year] += amount;

    // 요약
    total += amount;
    count++;
    if (amount > maxPayment) maxPayment = amount;
  });

  const avg = count > 0 ? Math.round(total / count) : 0;

  document.getElementById("totalPayment").textContent = total.toLocaleString() + "원";
  document.getElementById("avgPayment").textContent = avg.toLocaleString() + "원";
  document.getElementById("maxPayment").textContent = maxPayment.toLocaleString() + "원";

  renderMonthlyAmountChart(monthlyAmount);
  renderMonthlyCountChart(monthlyCount);
  renderYearlyAmountChart(yearlyAmount);
}

// ⭐ 월별 입금액 차트
function renderMonthlyAmountChart(data) {
  new Chart(document.getElementById("monthlyAmountChart"), {
    type: "bar",
    data: {
      labels: ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"],
      datasets: [{
        label: "입금액",
        data,
        backgroundColor: "#4a6fff"
      }]
    }
  });
}

// ⭐ 월별 입금 건수 차트
function renderMonthlyCountChart(data) {
  new Chart(document.getElementById("monthlyCountChart"), {
    type: "line",
    data: {
      labels: ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"],
      datasets: [{
        label: "입금 건수",
        data,
        borderColor: "#ff7f50",
        backgroundColor: "rgba(255,127,80,0.2)",
        tension: 0.3
      }]
    }
  });
}

// ⭐ 연도별 입금액 차트
function renderYearlyAmountChart(yearlyAmount) {
  const years = Object.keys(yearlyAmount);
  const values = Object.values(yearlyAmount);

  new Chart(document.getElementById("yearlyAmountChart"), {
    type: "bar",
    data: {
      labels: years,
      datasets: [{
        label: "연도별 입금액",
        data: values,
        backgroundColor: "#2ecc71"
      }]
    }
  });
}
