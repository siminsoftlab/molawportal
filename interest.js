/****************************************************
 * 연이자 계산기 — 독립 interest.js
 ****************************************************/

function calcInterest() {
  const principal = Number(document.getElementById("principal").value || 0);
  const rate      = Number(document.getElementById("rate").value || 0);
  const days      = Number(document.getElementById("days").value || 0);

  const interest = Math.floor(principal * (rate / 100) * (days / 365));
  const total = principal + interest;

  /****************************************************
   * 요약 카드
   ****************************************************/
  const summary = document.getElementById("interestSummary");
  summary.innerHTML = `총 상환액: ${total.toLocaleString()}원`;
  summary.style.display = "block";

  /****************************************************
   * 상세 계산 (아코디언 내부)
   ****************************************************/
  const acc = document.getElementById("interestAccordion");
  acc.innerHTML = `
    <div class="calc-step"><strong>1) 원금</strong><br>${principal.toLocaleString()}원</div>
    <div class="calc-step"><strong>2) 연이율</strong><br>${rate}%</div>
    <div class="calc-step"><strong>3) 기간</strong><br>${days}일</div>
    <div class="calc-step"><strong>4) 이자 계산식</strong><br>
      ${principal.toLocaleString()} × (${rate}/100) × (${days}/365)
      = <strong>${interest.toLocaleString()}원</strong>
    </div>
  `;

  /****************************************************
   * 설명 div 표시 (아코디언 밖)
   ****************************************************/
  const explain = document.getElementById("interestExplain");
  explain.style.display = "block";
  explain.innerHTML = `
    <h3>📌 연이자 계산기 자동 설명</h3>
    <p>
      원금 ${principal.toLocaleString()}원에 연이율 ${rate}%를 적용하고 
      ${days}일 동안 계산한 이자는 ${interest.toLocaleString()}원이며,
      최종 상환액은 ${total.toLocaleString()}원입니다.
    </p>
    <p>
      연이자 계산 공식:<br>
      <strong>원금 × (연이율 ÷ 100) × (일수 ÷ 365)</strong>
    </p>
  `;

  /****************************************************
   * 설명 애니메이션
   ****************************************************/
  setTimeout(() => explain.classList.add("visible"), 50);

  /****************************************************
   * 아코디언은 계산하기 후 자동으로 닫힘
   ****************************************************/
  acc.classList.remove("open");
  acc.style.maxHeight = null;

  const btn = document.querySelector(".interest-accordion-btn");
  btn.textContent = "계산 상세 보기 ▼";
}

/****************************************************
 * 상세보기 토글
 ****************************************************/
function toggleAccordion() {
  const box = document.getElementById("interestAccordion");
  const btn = document.querySelector(".interest-accordion-btn");

  const isOpen = box.classList.contains("open");

  if (isOpen) {
    box.classList.remove("open");
    box.style.maxHeight = null;
    btn.textContent = "계산 상세 보기 ▼";
  } else {
    box.classList.add("open");
    box.style.maxHeight = box.scrollHeight + "px";
    btn.textContent = "계산 상세 접기 ▲";
  }
}

/****************************************************
 * 초기화
 ****************************************************/
function resetInterestInputs() {
  document.getElementById("principal").value = "";
  document.getElementById("rate").value = 20;
  document.getElementById("days").value = "";

  document.getElementById("interestSummary").style.display = "none";

  const acc = document.getElementById("interestAccordion");
  acc.innerHTML = "";
  acc.classList.remove("open");
  acc.style.maxHeight = null;

  const explain = document.getElementById("interestExplain");
  explain.innerHTML = "";
  explain.style.display = "none";
  explain.classList.remove("visible");

  const btn = document.querySelector(".interest-accordion-btn");
  btn.textContent = "계산 상세 보기 ▼";
}
/****************************************************
 * 날짜 선택 시 자동으로 일수 계산
 ****************************************************/
function updateDays() {
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;

  if (!from || !to) return;

  const start = new Date(from);
  const end = new Date(to);

  // 밀리초 → 일수 변환
  const diffTime = end - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays >= 0) {
    document.getElementById("days").value = diffDays;
  }
}

// 날짜 변경 이벤트 연결
document.getElementById("fromDate").addEventListener("change", updateDays);
document.getElementById("toDate").addEventListener("change", updateDays);

