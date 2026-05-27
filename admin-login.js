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
   SHA-256 해시
   ============================================================ */
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/* ============================================================
   🔥 관리자 문서 자동 생성 (최초 1회)
   ============================================================ */
async function ensureAdminDoc() {
  const ref = db.collection("admin").doc("auth");
  const snap = await ref.get();

  if (!snap.exists) {
    // 기본 비밀번호: admin1234
    const defaultPw = "admin1234";
    const hash = await sha256(defaultPw);

    await ref.set({
      passwordHash: hash,
      createdAt: Date.now()
    });

    console.log("🔥 admin/auth 문서 자동 생성됨 (기본 비번: admin1234)");
  }
}

/* ============================================================
   로그인 처리
   ============================================================ */
async function adminLogin() {
  const pw = document.getElementById("pw").value.trim();
  const msg = document.getElementById("login-msg");

  if (!pw) {
    msg.textContent = "비밀번호를 입력하세요.";
    msg.style.color = "red";
    return;
  }

  const inputHash = await sha256(pw);

  const ref = db.collection("admin").doc("auth");
  const snap = await ref.get();

  if (!snap.exists) {
    msg.textContent = "관리자 인증 정보가 없습니다.";
    msg.style.color = "red";
    return;
  }

  const savedHash = snap.data().passwordHash;

  if (inputHash === savedHash) {
    localStorage.setItem("admin_token", inputHash);
    localStorage.setItem("admin_token_time", Date.now());

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
    window.location.href = "admin.html";
  }
}
/* ============================================================
   ⭐ 관리자 비밀번호 검증
   ============================================================ */
async function verifyAdminPassword(inputPw) {
  try {
    const doc = await db.collection("admin").doc("password").get();

    if (!doc.exists) {
      console.error("관리자 비밀번호 문서가 존재하지 않습니다.");
      return false;
    }

    const savedPw = doc.data().value;

    return inputPw === savedPw;
  } catch (e) {
    console.error("비밀번호 확인 중 오류:", e);
    return false;
  }
}

/* ============================================================
   실행
   ============================================================ */
window.onload = async () => {
  await ensureAdminDoc();  // 🔥 관리자 문서 자동 생성
  await checkAutoLogin();
  document.getElementById("login-btn").onclick = adminLogin;
};
