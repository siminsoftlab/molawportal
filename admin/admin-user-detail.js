const db = firebase.firestore();

function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

async function loadUserDetail() {
  const uid = getParam("uid");
  const box = document.getElementById("userDetail");

  if (!uid) {
    box.textContent = "잘못된 접근입니다.";
    return;
  }

  const doc = await db.collection("users").doc(uid).get();

  if (!doc.exists) {
    box.textContent = "회원 정보를 찾을 수 없습니다.";
    return;
  }

  const data = doc.data();

  box.textContent =
    `이름: ${data.name}
이메일: ${data.email}
휴대전화: ${data.phone || "-"}
가입일: ${new Date(data.created_at).toLocaleString()}
쿠폰 사용 여부: ${data.welcome_coupon_used ? "사용함" : "미사용"}`;
}

document.addEventListener("DOMContentLoaded", loadUserDetail);
