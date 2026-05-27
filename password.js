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

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

document.getElementById("change-btn").onclick = async () => {
  const oldPw = document.getElementById("old").value;
  const new1 = document.getElementById("new1").value;
  const new2 = document.getElementById("new2").value;
  const msg = document.getElementById("msg");

  if (!oldPw || !new1 || !new2) {
    msg.textContent = "모든 항목을 입력하세요.";
    msg.style.color = "red";
    return;
  }

  if (new1 !== new2) {
    msg.textContent = "새 비밀번호가 일치하지 않습니다.";
    msg.style.color = "red";
    return;
  }

  const oldHash = await sha256(oldPw);
  const newHash = await sha256(new1);

  const ref = db.collection("admin").doc("auth");
  const snap = await ref.get();

  if (!snap.exists) {
    msg.textContent = "관리자 정보가 없습니다.";
    msg.style.color = "red";
    return;
  }

  const savedHash = snap.data().passwordHash;

  if (oldHash !== savedHash) {
    msg.textContent = "현재 비밀번호가 틀렸습니다.";
    msg.style.color = "red";
    return;
  }

  await ref.set({ passwordHash: newHash }, { merge: true });

  msg.textContent = "비밀번호가 변경되었습니다.";
  msg.style.color = "green";

  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_token_time");

  setTimeout(() => {
    window.location.href = "admin-login.html";
  }, 1000);
};
