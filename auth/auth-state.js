firebase.auth().onAuthStateChanged(async (user) => {
  const before = document.getElementById("auth-before");
  const after = document.getElementById("auth-after");
  const nameSpan = document.getElementById("auth-username");

  if (user) {
    // Firestore에서 사용자 이름 가져오기
    const snap = await firebase.firestore().collection("users").doc(user.uid).get();
    const userData = snap.data();

    nameSpan.textContent = userData?.name || "사용자";

    before.style.display = "none";
    after.style.display = "flex";
  } else {
    before.style.display = "flex";
    after.style.display = "none";
  }
});

// 로그아웃
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      firebase.auth().signOut();
      alert("로그아웃 되었습니다.");
      location.reload();
    });
  }
});
