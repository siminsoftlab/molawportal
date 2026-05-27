/* Firebase 초기화 */
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

/* 오늘 날짜 */
function getTodayString() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const kst = new Date(utc + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/* 지도 초기화 */
let map = L.map("map").setView([20, 0], 2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

/* GeoIP 로드 */
async function loadIPStats() {
  const date = document.getElementById("ip-date").value;
  if (!date) return;

  const ref = db.collection("visitors").doc("geoip").collection(date);
  const snap = await ref.get();

  let countryCount = {};

  // 기존 마커 제거
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) map.removeLayer(layer);
  });

  snap.forEach(doc => {
    const d = doc.data();

    // 지도 마커
    if (d.lat && d.lon) {
      L.marker([d.lat, d.lon])
        .addTo(map)
        .bindPopup(`${d.city}, ${d.country}<br>방문: ${d.count}`);
    }

    // 국가별 통계
    if (!countryCount[d.country]) countryCount[d.country] = 0;
    countryCount[d.country] += d.count;
  });

  // 국가별 통계 출력
  let text = "";
  Object.keys(countryCount).forEach(c => {
    text += `${c}: ${countryCount[c]}명\n`;
  });

  document.getElementById("country-log").textContent = text || "데이터 없음";
}

/* 실행 */
window.onload = () => {
  // 오늘 날짜 자동 설정
  document.getElementById("ip-date").value = getTodayString();

  // 페이지 열리면 자동 조회
  loadIPStats();

  // 버튼 클릭 시 조회
  document.getElementById("ip-btn").onclick = loadIPStats;
};
