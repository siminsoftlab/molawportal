import { db } from "/firebase-init.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const tableBody = document.querySelector("#debtDetailTable tbody");

async function loadDebtorCreditors() {
  const colRef = collection(db, "debtor_creditors");
  const snap = await getDocs(colRef);

  snap.forEach(doc => {
    const c = doc.data();

    const principal = c.registeredAmount ?? 0;
    const overdue = c.overdueAmount ?? 0;
    const totalDebt = principal + overdue;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.creditor_name}</td>
      <td>${c.account}</td>
      <td>${c.loanType}</td>
      <td>${c.department}</td>
      <td>${c.collateral ? "담보" : "-"}</td>
      <td>${principal.toLocaleString()}</td>
      <td>${overdue.toLocaleString()}</td>
      <td>${totalDebt.toLocaleString()}</td>
      <td>${c.creditor_address || "-"}</td>
      <td>${c.debtor_name || "-"}</td>
      <td>${c.debtor_rrn || "-"}</td>
      <td>${c.debt_valid ? "유효" : "무효"}</td>
    `;
    tableBody.appendChild(tr);
  });
}

loadDebtorCreditors();
