//const auth = firebase.auth();

/* ============================================================
   비밀번호 변경
============================================================ */
async function changePassword() {
  const currentPassword = document.getElementById("currentPassword").value.trim();
  const newPassword = document.getElementById("newPassword").value.trim();
  const newPasswordConfirm = document.getElementById("newPasswordConfirm").value.trim();
  const msg = document.getElementById("msg");

  msg.textContent = "";

  // 필수 입력 체크
  if (!currentPassword || !newPassword || !newPasswordConfirm) {
    msg.textContent = "모든 항목을 입력해주세요.";
    return;
  }

  // 새 비밀번호 길이 체크
  if (newPassword.length < 6) {
    msg.textContent = "새 비밀번호는 6자리 이상이어야 합니다.";
    return;
  }

  // 🔥 현재 비밀번호와 새 비밀번호 동일한지 체크
  if (currentPassword === newPassword) {
    msg.textContent = "현재 비밀번호와 다른 번호를 입력해 주세요.";
    return;
  }

  // 🔥 새 비밀번호와 확인 비밀번호 일치 체크
  if (newPassword !== newPasswordConfirm) {
    msg.textContent = "신규 비밀번호가 일치하지 않습니다.";
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    msg.textContent = "로그인이 필요합니다.";
    return;
  }

  try {
    msg.textContent = "비밀번호 확인 중...";

    // 현재 비밀번호 재인증
    const credential = firebase.auth.EmailAuthProvider.credential(
      user.email,
      currentPassword
    );
    await user.reauthenticateWithCredential(credential);

    // 새 비밀번호 업데이트
    await user.updatePassword(newPassword);

    msg.textContent = "비밀번호가 성공적으로 변경되었습니다.";

    setTimeout(() => {
      window.location.href = "/mypage/mypage.html";
    }, 1500);

  } catch (error) {

     // 🔥 현재 비밀번호가 틀린 경우
     if (error.code === "auth/wrong-password" ||
         error.code === "auth/invalid-credential" ||
         error.message.includes("INVALID_LOGIN_CREDENTIALS")) {
       msg.textContent = "현재 비밀번호가 올바르지 않습니다.";
       return;
     }
   
     // 🔥 너무 약한 비밀번호 등 Firebase 정책 위반
     if (error.code === "auth/weak-password") {
       msg.textContent = "새 비밀번호가 너무 약합니다. 다른 비밀번호를 입력해주세요.";
       return;
     }
   
     // 🔥 기타 오류
     msg.textContent = "오류: " + error.message;
   }
}

/* ============================================================
   이벤트 바인딩
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("changePasswordBtn");
  if (btn) btn.addEventListener("click", changePassword);
});
