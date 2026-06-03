firebase.auth().onAuthStateChanged(async (user) => {
  const before = document.getElementById("auth-before");
  const after = document.getElementById("auth-after");
  const username = document.getElementById("auth-username");

  if (user) {
    before.style.display = "none";
    after.style.display = "flex";

    const doc = await firebase.firestore().collection("users").doc(user.uid).get();
    if (doc.exists) username.textContent = doc.data().name;
  } else {
    before.style.display = "flex";
    after.style.display = "none";
  }
});

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  firebase.auth().signOut().then(() => {
    window.location.reload();
  });
});
