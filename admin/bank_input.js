/* ============================================================
   Firebase 초기화
============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyACfN4_r2hUAn1NQPWRZzpegjyIESYGK3I",
  authDomain: "molawcounter.firebaseapp.com",
  projectId: "molawcounter",
  storageBucket: "molawcounter.firebasestorage.app",
  messagingSenderId: "989958208701",
  appId: "1:989958208701:web:16bd53eed95276f5d4cbd4",
  measurementId: "G-D4W34NBWKT"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* ============================================================
   입금내역 등록
============================================================ */
async function addBankDeposit() {
  const depositor = document.getElementById("depositor").value.trim();
  const amount = Number(document.getElementById("amount").value);
  const depositTime = document.getElementById("depositTime").value;

  if (!depositor || !amount || !depositTime) {
    alert("모든 항목을 입력해주세요.");
    return;
  }

  const timestamp = new Date(depositTime).getTime();

  await db.collection("bank_deposits").add({
    depositor_name: depositor,
    amount: amount,
    timestamp: timestamp,
    matched: false
  });

  alert("입금 내역이 등록되었습니다.\n자동 매칭 시스템이 실행됩니다.");

  // 입력 초기화
  document.getElementById("depositor").value = "";
  document.getElementById("amount").value = "";
  document.getElementById("depositTime").value = "";
}

/* ============================================================
   이벤트 바인딩
============================================================ */
document.getElementById("submitBtn").addEventListener("click", addBankDeposit);
document.getElementById("backBtn").addEventListener("click", () => {
  window.location.href = "/admin/index.html";
});
