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
   SHA-256 해시 함수
   ============================================================ */
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/* ============================================================
   관리자 로그인 처리
   ============================================================ */
async function adminLogin() {
  const pw = document.getElementById("pw").value.trim();
  const msg = document.getElementById("login-msg");

  if (!pw) {
    msg.textContent = "비밀번호를 입력하세요.";
    msg.style.color = "red";
    return;
  }

  // 입력한 비밀번호 해시 생성
  const inputHash = await sha256(pw);

  // Firestore에서 관리자 비밀번호 해시 가져오기
  const ref = db.collection("admin").doc("auth");
  const snap = await ref.get();

  if (!snap.exists) {
    msg.textContent = "관리자 인증 정보가 없습니다.";
    msg.style.color = "red";
    return;
  }

  const savedHash = snap.data().passwordHash;

  // 해시 비교
  if (inputHash === savedHash) {
    // 로그인 성공 → 토큰 저장
    localStorage.setItem("admin_token", inputHash);

    msg.textContent = "로그인 성공! 이동 중...";
    msg.style.color = "green";

    setTimeout(() => {
      window.location.href = "admin.html";
    }, 500);
  } else {
    msg.textContent = "비밀번호가 올바르지 않습니다.";
    msg.style.color = "red";
  }
}

/* ============================================================
   자동 로그인 체크
   ============================================================ */
async function checkAutoLogin() {
  const token = localStorage.getItem("admin_token");
  if (!token) return;

  const ref = db.collection("admin").doc("auth");
  const snap = await ref.get();

  if (!snap.exists) return;

  const savedHash = snap.data().passwordHash;

  if (token === savedHash) {
    // 이미 로그인됨 → 관리자 페이지로 이동
    window.location.href = "admin.html";
  }
}

/* ============================================================
   실행
   ============================================================ */
window.onload = () => {
  checkAutoLogin();
  document.getElementById("login-btn").onclick = adminLogin;
};
