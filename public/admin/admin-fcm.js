import { app } from "/firebase-init.js";
import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-functions.js";

const functions = getFunctions(app);
const sendPush = httpsCallable(functions, "sendPushToUser");

document.getElementById("sendBtn").onclick = async () => {
  const uid = document.getElementById("uid").value.trim();
  const title = document.getElementById("title").value.trim();
  const body = document.getElementById("body").value.trim();
  const resultEl = document.getElementById("result");

  if (!uid || !title || !body) {
    resultEl.textContent = "⚠️ UID, 제목, 내용을 모두 입력해주세요.";
    return;
  }

  resultEl.textContent = "⏳ 발송 중...";

  try {
    const res = await sendPush({ uid, title, body });
    resultEl.textContent = JSON.stringify(res.data, null, 2);
  } catch (err) {
    resultEl.textContent = "❌ 오류 발생: " + err.message;
  }
};
