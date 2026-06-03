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

const publicKey = "YOUR_PUBLIC_VAPID_KEY";

async function subscribeAdmin() {
  const registration = await navigator.serviceWorker.register("/sw.js");

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: publicKey
  });

  await db.collection("admin_push").doc("admin").set({
    subscription: subscription.toJSON()
  });

  alert("관리자 Push 알림이 활성화되었습니다.");
}

document.getElementById("subscribeBtn").addEventListener("click", subscribeAdmin);
