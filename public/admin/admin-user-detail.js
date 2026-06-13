/* ============================================================
   Firebase v9 모듈식 API import (CDN)
============================================================ */
import { db } from "/firebase-init.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/* ============================================================
   URL 파라미터 가져오기
============================================================ */
function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

/* ============================================================
   회원 상세 정보 불러오기
============================================================ */
async function loadUserDetail() {
  const uid = getParam("uid");
  const box = document.getElementById("userDetail");

  if (!uid) {
    box.textContent = "잘못된 접근입니다.";
    return;
  }

  const userDoc = await getDoc(doc(db, "users", uid));

  if (!userDoc.exists()) {
    box.textContent = "회원 정보를 찾을 수 없습니다.";
    return;
  }

  const data = userDoc.data();

  box.textContent =
    `이름: ${data.name}
이메일: ${data.email}
휴대전화: ${data.phone || "-"}
가입일: ${new Date(data.created_at).toLocaleString()}
쿠폰 사용 여부: ${data.welcome_coupon_used ? "사용함" : "미사용"}`;
}

/* ============================================================
   실행
============================================================ */
document.addEventListener("DOMContentLoaded", loadUserDetail);
