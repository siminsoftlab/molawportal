import { db } from "/firebase-init.js";
import {
  collection, getDocs, query, where
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// ⭐ 전체 매니저 로드
async function loadManagers() {
  const q = query(collection(db, "users"), where("role", "==", "manager"));
  const snap = await getDocs(q);

  const rankingData = [];

  for (const docSnap of snap.docs) {
    const manager = { uid: docSnap.id, ...docSnap.data() };
    const kpi = await calculateKPI(manager.uid);
    const score = calculateScore(kpi);

    rankingData.push({ manager, kpi, score });
  }

  // 점수 기준 내림차순 정렬
  rankingData.sort((a, b) => b.score.total - a.score.total);

  renderRanking(rankingData);
}

// ⭐ KPI 계산
async function calculateKPI(managerUid) {
  // 상담
  const consultQ = query(
    collection(db, "consult_requests"),
    where("assignedTo", "==", managerUid)
  );
  const consultSnap = await getDocs(consultQ);
  const totalConsult = consultSnap.size;

  // 계약
  const contractQ = query(
    collection(db, "contracts"),
    where("managerUid", "==", managerUid)
  );
  const contractSnap = await getDocs(contractQ);
  const totalContract = contractSnap.size;

  // 입금
  const paymentQ = query(
    collection(db, "payments"),
    where("managerUid", "==", managerUid)
  );
  const paymentSnap = await getDocs(paymentQ);

  let totalPaymentAmount = 0;
  paymentSnap.forEach(d => totalPaymentAmount += d.data().amount || 0);

  // 전환율
  const consultToContractRate =
    totalConsult > 0 ? Math.round((totalContract / totalConsult) * 100) : 0;

  const contractToPaymentRate =
    totalContract > 0 ? Math.round((paymentSnap.size / totalContract) * 100) : 0;

  return {
    totalConsult,
    totalContract,
    totalPaymentAmount,
    consultToContractRate,
    contractToPaymentRate
  };
}

// ⭐ 점수 계산 공식
function calculateScore(kpi) {
  const consultScore = kpi.totalConsult * 1;
  const contractScore = kpi.totalContract * 10;
  const paymentScore = Math.round(kpi.totalPaymentAmount / 100000); // 10만 원당 1점
  const conversionScore =
    kpi.consultToContractRate * 2 +
    kpi.contractToPaymentRate * 2;

  const total = consultScore + contractScore + paymentScore + conversionScore;

  return {
    consultScore,
    contractScore,
    paymentScore,
    conversionScore,
    total
  };
}

// ⭐ 테이블 렌더링
function renderRanking(list) {
  const tbody = document.getElementById("rankingTableBody");
  tbody.innerHTML = "";

  list.forEach((item, index) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.manager.name}</td>
      <td>${item.kpi.totalConsult}</td>
      <td>${item.kpi.totalContract}</td>
      <td>${item.kpi.totalPaymentAmount.toLocaleString()}원</td>
      <td>${item.score.conversionScore}점</td>
      <td>${item.score.total}점</td>
      <td>
        <button class="btn-small" onclick="openManagerDetail('${item.manager.uid}')">보기</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// ⭐ 매니저 상세 KPI 페이지 이동
window.openManagerDetail = function(uid) {
  location.href = `/manager/performance-dashboard.html?uid=${uid}`;
};

// 실행
loadManagers();
