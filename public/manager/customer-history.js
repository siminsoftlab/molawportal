import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  doc, getDoc,
  collection, query, where, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// URL에서 고객 ID 가져오기
const params = new URLSearchParams(location.search);
const customerId = params.get("id");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "/manager/login.html";
    return;
  }

  loadCustomerInfo();
  loadConsultHistory();
  loadContractHistory();
  loadPaymentHistory();
});

// ⭐ 고객 기본 정보
async function loadCustomerInfo() {
  const ref = doc(db, "customers", customerId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const data = snap.data();

  document.getElementById("name").textContent = data.name || "-";
  document.getElementById("phone").textContent = data.phone || "-";
  document.getElementById("email").textContent = data.email || "-";
}

// ⭐ 상담 히스토리
function loadConsultHistory() {
  const q = query(
    collection(db, "consult_requests"),
    where("customerId", "==", customerId),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, (snap) => {
    const tbody = document.getElementById("consultHistory");
    tbody.innerHTML = "";

    snap.forEach(docSnap => {
      const item = docSnap.data();
      const tr = document.createElement("tr");

      const date = item.createdAt?.toDate
        ? item.createdAt.toDate().toLocaleDateString()
        : "-";

      tr.innerHTML = `
        <td>${date}</td>
        <td>${item.applyType || "-"}</td>
        <td>${item.status || "-"}</td>
        <td><button class="btn-secondary" onclick="openConsult('${docSnap.id}')">보기</button></td>
      `;

      tbody.appendChild(tr);
    });
  });
}

// ⭐ 계약 히스토리
function loadContractHistory() {
  const q = query(
    collection(db, "contracts"),
    where("customerId", "==", customerId),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, (snap) => {
    const tbody = document.getElementById("contractHistory");
    tbody.innerHTML = "";

    snap.forEach(docSnap => {
      const item = docSnap.data();
      const tr = document.createElement("tr");

      const date = item.createdAt?.toDate
        ? item.createdAt.toDate().toLocaleDateString()
        : "-";

      tr.innerHTML = `
        <td>${item.contractCode || "-"}</td>
        <td>${date}</td>
        <td>${item.status || "-"}</td>
        <td><button class="btn-secondary" onclick="openContract('${docSnap.id}')">보기</button></td>
      `;

      tbody.appendChild(tr);
    });
  });
}

// ⭐ 입금 히스토리
function loadPaymentHistory() {
  const q = query(
    collection(db, "payments"),
    where("customerId", "==", customerId),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, (snap) => {
    const tbody = document.getElementById("paymentHistory");
    tbody.innerHTML = "";

    snap.forEach(docSnap => {
      const item = docSnap.data();
      const tr = document.createElement("tr");

      const date = item.createdAt?.toDate
        ? item.createdAt.toDate().toLocaleDateString()
        : "-";

      tr.innerHTML = `
        <td>${item.amount?.toLocaleString() || "0"}원</td>
        <td>${date}</td>
        <td>${item.status || "-"}</td>
        <td><button class="btn-secondary" onclick="openPayment('${docSnap.id}')">보기</button></td>
      `;

      tbody.appendChild(tr);
    });
  });
}

// ⭐ 상세 페이지 이동
window.openConsult = function(id) {
  location.href = `/manager/consult-detail.html?id=${id}`;
};

window.openContract = function(id) {
  location.href = `/manager/contract-detail.html?id=${id}`;
};

window.openPayment = function(id) {
  location.href = `/manager/payment-detail.html?id=${id}`;
};
