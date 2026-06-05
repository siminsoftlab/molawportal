/* ============================================================
   Firebase 초기화 (모든 페이지 공통)
============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyACfN4_r2hUAn1NQPWRZzpegjyIESYGK3I",
  authDomain: "molawcounter.firebaseapp.com",
  projectId: "molawcounter",
  storageBucket: "molawcounter.firebasestorage.app",
  messagingSenderId: "989958208701",
  appId: "1:989958208701:web:16bd53eed95276f5d4cbd4",
  measurementId: "G-D4W34NBWKT"
};

/* ⭐ 이미 초기화된 경우 다시 초기화하지 않음 (중복 초기화 방지) */
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

/* ⭐ 여기 추가해야 함 */
const auth = firebase.auth();

/* Firestore 인스턴스 */
const db = firebase.firestore();
