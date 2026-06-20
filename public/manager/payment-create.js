import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  collection, query, where, getDocs,
  addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

let managerUid = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "/manager/login.html";
    return;
  }

  managerUid = user.uid;

  await loadCustomers();
});

// ⭐ 고객 목록 불러오기
async function loadCustomers() {
  const q = query(collection(db, "customers"), where("managerUid", "==", managerUid));
  const snap = await getDocs(q);

  const select = document.getElementById("customerSelect");
  select.innerHTML = "<option value=''>고객 선택</option>";

  snap.forEach(docSnap => {
    const d = docSnap.data();
    select.innerHTML += `<option value="${docSnap.id}">${d.name} (${d.phone})</option>`;
  });

  select.addEventListener("change", loadContracts);
}

// ⭐ 선택한 고객의 계약 불러오기
async function loadContracts() {
  const customerId = document.getElementById("customerSelect").value;
  const select = document.getElementById("contractSelect");

  if (!customerId) {
    select.innerHTML = "<option value=''>계약 선택</option>";
    return;
  }

  const q = query(
    collection(db, "contracts"),
    where("customerId", "==", customerId)
  );

  const snap = await getDocs(q);

  select.innerHTML = "<option value=''>계약 선택</option>";

  snap.forEach(docSnap => {
    const d = docSnap.data();
    select.innerHTML += `<option value="${docSnap.id}">${d.contractCode || "계약"} - ${d.amount?.toLocaleString()}원</option>`;
  });
}

// ⭐ 입금 등록
document.getElementById("saveBtn").addEventListener("click", async () => {
  const customerId = document.getElementById("customerSelect").value;
  const contractId = document.getElementById("contractSelect").value;
  const amount = Number(document.getElementById("amount").value);
  const paymentDate = document.getElementById("paymentDate").value;
  const memo = document.getElementById("memo").value.trim();

  if (!customerId || !contractId || !amount || !paymentDate) {
    alert("필수 항목을 모두 입력하세요.");
    return;
  }

  const ref = await addDoc(collection(db, "payments"), {
    customerId,
    contractId,
    amount,
    paymentDate,
    memo,
    managerUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  alert("입금이 등록되었습니다.");
  location.href = `/manager/payment-detail.html?id=${ref.id}`;
});
