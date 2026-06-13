/* ============================================================
   Firebase v9 모듈식 API import (CDN)
============================================================ */
import { db } from "/firebase-init.js";
import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  updateDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/* ============================================================
   이용권 목록 불러오기
============================================================ */
async function loadTokens() {
  const list = document.getElementById("tokenList");

  const q = query(collection(db, "access_tokens"), orderBy("created_at", "desc"));
  const snap = await getDocs(q);

  if (snap.empty) {
    list.innerHTML = "<p>등록된 이용권이 없습니다.</p>";
    return;
  }

  const now = Date.now();
  let html = "";

  snap.forEach(docSnap => {
    const t = docSnap.data();

    const start = t.created_at
      ? new Date(t.created_at).toLocaleString("ko-KR")
      : "-";

    const expire = t.expire_at
      ? new Date(t.expire_at).toLocaleString("ko-KR")
      : "-";

    // 상태 계산
    let statusText = "";
    let statusClass = "";

    if (!t.is_active) {
      statusText = "비활성";
      statusClass = "status-inactive";
    } else if (t.expire_at && t.expire_at < now) {
      statusText = "만료";
      statusClass = "status-expired";
    } else {
      statusText = "활성";
      statusClass = "status-active";
    }

    html += `
      <div class="token-item">
        <p><strong>유저 ID:</strong> ${t.user_id}</p>
        <p><strong>토큰:</strong> ${t.token}</p>
        <p><strong>유형:</strong> ${t.type}</p>
        <p><strong>시작일:</strong> ${start}</p>
        <p><strong>만료일:</strong> ${expire}</p>
        <p><strong>상태:</strong> 
          <span class="status-badge ${statusClass}">
            ${statusText}
          </span>
        </p>

        <div class="token-actions">
          <button class="btn-secondary" onclick="deactivateToken('${docSnap.id}')">
            비활성화
          </button>
        </div>
      </div>
    `;
  });

  list.innerHTML = html;
}

/* ============================================================
   이용권 비활성화
============================================================ */
async function deactivateToken(id) {
  if (!confirm("이 이용권을 비활성화하시겠습니까?")) return;

  await updateDoc(doc(collection(db, "access_tokens"), id), {
    is_active: false
  });

  alert("비활성화 완료");
  loadTokens();
}

/* ============================================================
   뒤로가기
============================================================ */
document.getElementById("backBtn").addEventListener("click", () => {
  window.location.href = "/admin.html";
});

/* ============================================================
   실행
============================================================ */
loadTokens();

/* ============================================================
   전역 노출 (onclick에서 호출 가능하도록)
============================================================ */
window.deactivateToken = deactivateToken;
