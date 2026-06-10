/* ============================
   공통 인증 + 이용권 체크 모듈
============================ */

/**
 * 계산기 실행 전 공통 접근 체크
 * @param {Function} onSuccess - 인증/이용권 통과 후 실행할 계산 함수
 */
async function checkAccess(onSuccess) {
  try {
    const user = await checkLoginStatus();
    if (!user.isLoggedIn) {
      openModal("login");
      return;
    }

    const license = await checkLicenseStatus();
    if (!license.isActive) {
      if (license.isExpired) {
        openModal("expired");
      } else {
        openModal("purchase");
      }
      return;
    }

    // 모든 조건 충족 → 계산 실행
    onSuccess();

  } catch (err) {
    console.error("checkAccess 오류:", err);
    alert("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
  }
}

/* ============================
   로그인 상태 체크
============================ */
async function checkLoginStatus() {
  const res = await fetch("/api/auth/status");
  return await res.json();
}

/* ============================
   이용권 상태 체크
============================ */
async function checkLicenseStatus() {
  const res = await fetch("/api/license/status");
  return await res.json();
}

/* ============================
   모달 열기
============================ */
function openModal(type) {
  switch (type) {
    case "login":
      document.getElementById("loginRequiredModal").style.display = "flex";
      break;

    case "purchase":
      document.getElementById("paywallOverlay").style.display = "flex";
      break;

    case "expired":
      document.getElementById("paywallOverlay").style.display = "flex";
      break;
  }
}
