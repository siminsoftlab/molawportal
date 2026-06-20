import { db } from "/firebase-init.js";
import {
  collection, getDocs, query, where
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// ⭐ 전체 매니저 로드
async function loadManagers() {
  const q = query(collection(db, "users"), where("role", "==", "manager"));
  const snap = await getDocs(q);

  const managers = snap.docs.map(doc => ({
    uid: doc.id,
    ...doc.data()
  }));

  for (const manager of managers) {
    const kpi = await calculateKPI(manager.uid);
    renderRow(manager, kpi);
  }
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

  // 평균 계약 금액
  let totalContractAmount = 0;
  contractSnap.forEach(d => totalContractAmount += d.data().amount || 0);

  const avgContractAmount = totalContract > 0
    ? Math.round(totalContractAmount / totalContract)
    : 0;

  const avgPaymentAmount = paymentSnap.size > 0
    ? Math.round(totalPaymentAmount / paymentSnap.size)
    : 0;

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
    contractToPaymentRate,
    avgContractAmount,
    avgPaymentAmount
  };
}

// ⭐ 테이블 렌더링
function renderRow(manager, kpi) {
  const tbody = document.getElementById("kpiTableBody");

  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>${manager.name}</td>
    <td>${kpi.totalConsult}건</td>
    <td>${kpi.totalContract}건</td>
    <td>${kpi.totalPaymentAmount.toLocaleString()}원</td>
    <td>${kpi.consultToContractRate}%</td>
    <td>${kpi.contractToPaymentRate}%</td>
    <td>${kpi.avgContractAmount.toLocaleString()}원</td>
    <td>${kpi.avgPaymentAmount.toLocaleString()}원</td>
    <td>
      <button class="btn-small" onclick="openManagerDetail('${manager.uid}')">보기</button>
    </td>
  `;

  tbody.appendChild(tr);
}

// ⭐ 매니저 상세 KPI 페이지 이동
window.openManagerDetail = function(uid) {
  location.href = `/manager/performance-dashboard.html?uid=${uid}`;
};

// 실행
loadManagers();
