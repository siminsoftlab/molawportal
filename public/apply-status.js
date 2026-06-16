import { db } from "/firebase-init.js";
import { collection, query, orderBy, limit, getDocs } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function loadApplyStatus() {
  const listEl = document.getElementById("applyStatusList");
  if (!listEl) return; // index.html이 아닐 때 오류 방지

  listEl.innerHTML = "<li>불러오는 중...</li>";

  try {
    const q = query(
      collection(db, "apply"),
      orderBy("timestamp", "desc"),
      limit(5)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      listEl.innerHTML = "<li>최근 신청 내역이 없습니다.</li>";
      return;
    }

    listEl.innerHTML = "";

    snapshot.forEach(doc => {
      const data = doc.data();
      const name = data.name || "이름 없음";
      const type = data.applyType || "유형 없음";

      const item = `
        <li>
          <span>${name}</span>
          <span>${type}</span>
        </li>
      `;
      listEl.innerHTML += item;
    });
  } catch (e) {
    listEl.innerHTML = "<li>불러오는 중 오류 발생</li>";
    console.error(e);
  }
}

loadApplyStatus();
