/* ============================================================
   Firebase 초기화 (firebase-init.js에서 가져옴)
============================================================ */
import { db } from "/firebase-init.js";
import {
  collection,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/* ============================================================
   SHA-256 해시
============================================================ */
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ============================================================
   관리자 문서 자동 생성
============================================================ */
async function ensureAdminDoc() {
  const ref = doc(db, "admin", "auth");
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const defaultPw = "admin1234";
    const hash = await sha256(defaultPw);

    await setDoc(ref, {
      passwordHash: hash,
      createdAt: Date.now()
    });

    console.log("🔥 admin/auth 문서 생성됨 (기본 비번: admin1234)");
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
  const ref = doc(db, "admin", "auth");
  const snap = await getDoc(ref);

  if (!snap.exists()) {
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
    }, 400);
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

  const ref = doc(db, "admin", "auth");
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  if (token === snap.data().passwordHash) {
    window.location.href = "admin.html";
  }
}

/* ============================================================
   실행 (DOMContentLoaded)
============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
  const btn = document.getElementById("login-btn");
  btn.disabled = true;

  await ensureAdminDoc();
  await checkAutoLogin();

  btn.disabled = false;
  btn.onclick = adminLogin;
});
