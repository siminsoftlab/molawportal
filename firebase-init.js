document.addEventListener("DOMContentLoaded", () => {

  const firebaseConfig = {
    apiKey: "AIzaSyACfN4_r2hUAn1NQPWRZzpegjyIESYGK3I",
    authDomain: "molawcounter.firebaseapp.com",
    projectId: "molawcounter",
    storageBucket: "molawcounter.firebasestorage.app",
    messagingSenderId: "989958208701",
    appId: "1:989958208701:web:16bd53eed95276f5d4cbd4",
    measurementId: "G-D4W34NBWKT"
  };

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  window.auth = firebase.auth();
  window.db = firebase.firestore();

  console.log("firebase-init.js initialized");
});
