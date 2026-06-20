import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  doc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// URL에서 고객 ID 가져오기
const params = new URLSearchParams(location.search);
const customerId = params.get("id");

// 사용할 태그 목록
const TAGS = [
  "VIP",
  "재계약 가능성 높음",
  "민원 위험",
  "고액 고객",
  "빠른 응답",
  "장기 고객",
  "신규 고객",
  "이탈 위험"
];

let selectedTags = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "/manager/login.html";
    return;
  }

  loadCustomerTags();
});

// ⭐ 고객 태그/등급 불러오기
async function loadCustomerTags() {
  const ref = doc(db, "customers", customerId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const data = snap.data();

  selectedTags = data.tags || [];
  document.getElementById("gradeSelect").value = data.grade || "";

  renderTags();
}

// ⭐ 태그 UI 렌더링
function renderTags() {
  const tagList = document.getElementById("tagList");
  tagList.innerHTML = "";

  TAGS.forEach(tag => {
    const div = document.createElement("div");
    div.className = "tag" + (selectedTags.includes(tag) ? " active" : "");
    div.textContent = tag;

    div.addEventListener("click", () => {
      if (selectedTags.includes(tag)) {
        selectedTags = selectedTags.filter(t => t !== tag);
      } else {
        selectedTags.push(tag);
      }
      renderTags();
    });

    tagList.appendChild(div);
  });
}

// ⭐ 저장하기
document.getElementById("saveBtn").addEventListener("click", async () => {
  const grade = document.getElementById("gradeSelect").value;

  const ref = doc(db, "customers", customerId);

  await updateDoc(ref, {
    tags: selectedTags,
    grade,
    updatedAt: new Date()
  });

  alert("저장되었습니다.");
});
