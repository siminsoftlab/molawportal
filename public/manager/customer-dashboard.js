import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  doc, getDoc,
  collection, query, where, orderBy, limit, onSnapshot
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
  loadConsultSummary();
  loadContractSummary();
  loadPaymentSummary();

  loadRecentConsult();
  loadRecentContract();
  loadRecentPayment();
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
  document.getElementById("memo").textContent = data.memo || "-";
}

// ⭐ 상담 요약
function loadConsultSummary() {
  const q = query(
    collection(db, "consult_requests"),
    where("customerId", "==", customerId)
  );

  onSnapshot(q, (snap) => {
    document.getElementById("consultCount").textContent = snap.size + "건";
  });
}

// ⭐ 계약 요약
function loadContractSummary() {
  const q = query(
    collection(db, "contracts"),
    where("customerId", "==", customerId)
  );

  onSnapshot(q, (snap) => {
    document.getElementById("contractCount").textContent = snap.size + "건";
  });
}

// ⭐ 입금 요약
function loadPaymentSummary() {
  const q = query(
    collection(db, "payments"),
    where("customerId", "==", customerId)
  );

  onSnapshot(q, (snap) => {
    document.getElementById("paymentCount").textContent = snap.size + "건";
  });
}

// ⭐ 최근 상담
function loadRecentConsult() {
  const q = query(
    collection(db, "consult_requests"),
    where("customerId", "==", customerId),
    orderBy("createdAt", "desc"),
    limit(5)
  );

  onSnapshot(q, (snap) => {
    const tbody = document.getElementById("recentConsult");
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
        <td><button class="btn-small" onclick="openConsult('${docSnap.id}')">보기</button></td>
      `;

      tbody.appendChild(tr);
    });
  });
}

// ⭐ 최근 계약
function loadRecentContract() {
  const q = query(
    collection(db, "contracts"),
    where("customerId", "==", customerId),
    orderBy("createdAt", "desc"),
    limit(5)
  );

  onSnapshot(q, (snap) => {
    const tbody = document.getElementById("recentContract");
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
        <td><button class="btn-small" onclick="openContract('${docSnap.id}')">보기</button></td>
      `;

      tbody.appendChild(tr);
    });
  });
}

// ⭐ 최근 입금
function loadRecentPayment() {
  const q = query(
    collection(db, "payments"),
    where("customerId", "==", customerId),
    orderBy("createdAt", "desc"),
    limit(5)
  );

  onSnapshot(q, (snap) => {
    const tbody = document.getElementById("recentPayment");
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
        <td><button class="btn-small" onclick="openPayment('${docSnap.id}')">보기</button></td>
      `;

      tbody.appendChild(tr);
    });
  });
}

// ⭐ 상세 페이지 이동
window.openDetail = function() {
  location.href = `/manager/customer-detail.html?id=${customerId}`;
};

window.openHistory = function() {
  location.href = `/manager/customer-history.html?id=${customerId}`;
};

window.openConsult = function(id) {
  location.href = `/manager/consult-detail.html?id=${id}`;
};

window.openContract = function(id) {
  location.href = `/manager/contract-detail.html?id=${id}`;
};

window.openPayment = function(id) {
  location.href = `/manager/payment-detail.html?id=${id}`;
};
