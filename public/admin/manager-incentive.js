import { db } from "/firebase-init.js";
import {
  collection, query, where, getDocs, doc, setDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// ⭐ 인센티브 계산 버튼
document.getElementById("calcBtn").addEventListener("click", async () => {
  const month = document.getElementById("monthInput").value;
  if (!month) return alert("월을 선택하세요.");

  await loadManagersAndCalculate(month);
});

// ⭐ 전체 매니저 불러오기 + KPI 계산
async function loadManagersAndCalculate(month) {
  const q = query(collection(db, "users"), where("role", "==", "manager"));
  const snap = await getDocs(q);

  const tbody = document.getElementById("incentiveTableBody");
  tbody.innerHTML = "";

  for (const docSnap of snap.docs) {
    const manager = { uid: docSnap.id, ...docSnap.data() };
    const kpi = await calculateMonthlyKPI(manager.uid, month);
    const incentive = calculateIncentive(kpi);

    renderRow(manager, kpi, incentive, month);
  }
}

// ⭐ 특정 월 KPI 계산
async function calculateMonthlyKPI(managerUid, month) {
  const [year, monthNum] = month.split("-");
  const start = new Date(year, monthNum - 1, 1);
  const end = new Date(year, monthNum, 1);

  // 상담
  const consultQ = query(
    collection(db, "consult_requests"),
    where("assignedTo", "==", managerUid)
  );
  const consultSnap = await getDocs(consultQ);
  const consultCount = consultSnap.docs.filter(d => {
    const t = d.data().createdAt?.toDate();
    return t >= start && t < end;
  }).length;

  // 계약
  const contractQ = query(
    collection(db, "contracts"),
    where("managerUid", "==", managerUid)
  );
  const contractSnap = await getDocs(contractQ);
  const contractDocs = contractSnap.docs.filter(d => {
    const t = d.data().createdAt?.toDate();
    return t >= start && t < end;
  });
  const contractCount = contractDocs.length;

  // 입금
  const paymentQ = query(
    collection(db, "payments"),
    where("managerUid", "==", managerUid)
  );
  const paymentSnap = await getDocs(paymentQ);
  let paymentAmount = 0;
  paymentSnap.docs.forEach(d => {
    const t = d.data().createdAt?.toDate();
    if (t >= start && t < end) paymentAmount += d.data().amount || 0;
  });

  return { consultCount, contractCount, paymentAmount };
}

// ⭐ 인센티브 계산 공식
function calculateIncentive(kpi) {
  const consultBonus = kpi.consultCount * 1000;
  const contractBonus = kpi.contractCount * 10000;
  const paymentBonus = Math.round(kpi.paymentAmount * 0.02);

  const total = consultBonus + contractBonus + paymentBonus;

  return { consultBonus, contractBonus, paymentBonus, total };
}

// ⭐ 테이블 렌더링
function renderRow(manager, kpi, incentive, month) {
  const tbody = document.getElementById("incentiveTableBody");

  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>${manager.name}</td>
    <td>${kpi.consultCount}</td>
    <td>${kpi.contractCount}</td>
    <td>${kpi.paymentAmount.toLocaleString()}원</td>
    <td>${incentive.total.toLocaleString()}원</td>
    <td>
      <button class="btn-small" onclick="saveIncentive('${manager.uid}', '${month}', ${incentive.total})">저장</button>
    </td>
  `;

  tbody.appendChild(tr);
}

// ⭐ Firestore 저장
window.saveIncentive = async function(uid, month, total) {
  await setDoc(doc(db, "users", uid, "incentives", month), {
    month,
    incentiveTotal: total,
    calculatedAt: new Date()
  });

  alert("인센티브가 저장되었습니다.");
};
