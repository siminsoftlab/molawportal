/****************************************************
 * Firebase v9 import
 ****************************************************/
import { auth, db } from "/firebase-init.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/****************************************************
 * 공통 유틸
 ****************************************************/
function $(id) {
  return document.getElementById(id);
}

function toNumber(v) {
  if (typeof v === "string") v = v.replace(/[^\d]/g, "");
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

/****************************************************
 * 숫자 입력 안정화
 ****************************************************/
function sanitizeNumberInput(el) {
  el.value = el.value.replace(/[^\d]/g, "");
}

/****************************************************
 * 법원 생계비 자동 계산
 ****************************************************/
function calcCourtLiving(household) {
  const base = 1538523;
  const w = {1:1.0, 2:1.5, 3:2.1, 4:2.6, 5:3.1};
  return Math.round(base * (w[household] || 1));
}

function updateLivingCost() {
  const household = Number($("household").value || 1);
  $("living").value = calcCourtLiving(household);
}

/****************************************************
 * 계산하기 — 로그인 + 이용권 활성 + 만료 체크
 ****************************************************/
async function calcRepay() {

  /* 1) 로그인 여부 체크 (v9) */
  const user = auth.currentUser;

  if (!user) {
    document.getElementById("loginRequiredModal").style.display = "flex";
    return;
  }

  /* 2) Firestore에서 이용권 조회 (v9) */
  const q = query(
    collection(db, "access_tokens"),
    where("user_id", "==", user.uid)
  );

  const tokenSnap = await getDocs(q);

  if (tokenSnap.empty) {
    document.getElementById("paywallOverlay").style.display = "flex";
    return;
  }

  /* 3) 가장 늦게 만료되는 이용권 선택 */
  let best = null;
  tokenSnap.forEach(doc => {
    const data = doc.data();
    if (!best || data.expire_at > best.expire_at) {
      best = data;
    }
  });

  /* 4) 활성 여부 체크 */
  if (!best.is_active) {
    document.getElementById("paywallOverlay").style.display = "flex";
    return;
  }

  /* 5) 만료일 체크 */
  let expireAt = best.expire_at;
  let expireDate;

  if (expireAt instanceof Date) {
    expireDate = expireAt;
  } else if (expireAt?.toDate) {
    expireDate = expireAt.toDate();
  } else {
    expireDate = new Date(expireAt);
  }

  if (expireDate < new Date()) {
    document.getElementById("paywallOverlay").style.display = "flex";
    return;
  }

  /****************************************************
   * 필수 입력 검증
   ****************************************************/
  if (
    $("debt").value.trim() === "" ||
    $("income").value.trim() === "" ||
    $("living").value.trim() === "" ||
    $("months").value.trim() === ""
  ) {
    alert("총 부채, 월 소득, 최저 생계비, 변제기간(개월)을 모두 입력해주세요.");
    return;
  }

  /****************************************************
   * 계산 로직
   ****************************************************/
  const debt   = toNumber($("debt").value);
  const income = toNumber($("income").value);
  const living = toNumber($("living").value);
  const extra  = toNumber($("extra").value);
  const months = toNumber($("months").value);
  const asset  = toNumber($("asset").value);

  const disposable = income - living - extra;
  const monthlyPay = Math.max(disposable, 0);
  const totalPay   = monthlyPay * months;

  const discountRate = 0.03;
  const years        = months / 12;

  const requiredFinalPay = Math.round(asset * Math.pow(1 + discountRate, years));
  const finalPay         = Math.max(totalPay, asset, requiredFinalPay);

  const autoAdjusted = finalPay === requiredFinalPay;

  const repayRate  = debt > 0 ? ((finalPay / debt) * 100).toFixed(1) : "0.0";
  const reliefRate = (100 - Number(repayRate)).toFixed(1);

  const presentValue = Math.round(finalPay / Math.pow(1 + discountRate, years));

  /****************************************************
   * 요약 카드
   ****************************************************/
  const summary = $("repaySummary");
  summary.style.display = "block";

  summary.innerHTML = `
    <div class="repay-highlight-box">
      <div class="row"><div class="label">총 부채</div><div class="value">${debt.toLocaleString()}원</div></div>
      <div class="row"><div class="label">월 변제 가능 금액</div><div class="value">${monthlyPay.toLocaleString()}원</div></div>
      <div class="row"><div class="label">총 변제예정액</div><div class="value">${totalPay.toLocaleString()}원</div></div>
      <div class="row"><div class="label">최종 변제금</div><div class="value">${finalPay.toLocaleString()}원</div></div>

      ${autoAdjusted ? `<div class="auto-adjust-msg">⚙️ PV 충족을 위해 자동 조정되었습니다.</div>` : ""}

      <div class="row"><div class="label">변제율</div><div class="value">${repayRate}%</div></div>

      <div class="rate-big">
        탕감률 ${reliefRate}%<br>
        <span style="font-size:0.9rem;">(법원에서 탕감되는 비율)</span>
      </div>

      <div class="row"><div class="label">현재가치(PV)</div><div class="value">${presentValue.toLocaleString()}원</div></div>
      <div class="row"><div class="label">청산가치 충족 여부</div><div class="value" style="color:#008000;">✔ 충족</div></div>
    </div>
  `;

  /****************************************************
   * 상세 계산
   ****************************************************/
  const acc = $("repayAccordion");
  acc.innerHTML = `
    <div class="repay-highlight-box-red">
      <div class="row"><div class="label">총 부채</div><div class="value">${debt.toLocaleString()}원</div></div>
      <div class="row"><div class="label">월 소득</div><div class="value">${income.toLocaleString()}원</div></div>
      <div class="row"><div class="label">법원 생계비</div><div class="value">${living.toLocaleString()}원</div></div>
      <div class="row"><div class="label">추가 생계비</div><div class="value">${extra.toLocaleString()}원</div></div>
      <div class="row"><div class="label">가용소득</div><div class="value">${monthlyPay.toLocaleString()}원</div></div>
      <div class="row"><div class="label">변제기간</div><div class="value">${months}개월</div></div>
      <div class="row"><div class="label">총 변제예정액</div><div class="value">${totalPay.toLocaleString()}원</div></div>
      <div class="row"><div class="label">PV 최소 변제금</div><div class="value">${requiredFinalPay.toLocaleString()}원</div></div>
      <div class="row"><div class="label">현재가치(PV)</div><div class="value">${presentValue.toLocaleString()}원</div></div>
      <div class="row"><div class="label">청산가치</div><div class="value">${asset.toLocaleString()}원</div></div>
      <div class="row"><div class="label">최종 변제금</div><div class="value">${finalPay.toLocaleString()}원</div></div>
      <div class="row"><div class="label">변제율</div><div class="value">${repayRate}%</div></div>
      <div class="row"><div class="label">탕감률</div><div class="value">${reliefRate}%</div></div>

      ${autoAdjusted ? `<div class="row"><div class="label">자동 조정</div><div class="value" style="color:#2a5f9e;">PV 충족 위해 자동 조정됨</div></div>` : ""}
    </div>
  `;

  /****************************************************
   * 설명
   ****************************************************/
  const explain = $("repayExplain");
  explain.style.display = "block";
  explain.innerHTML = `
    <h3>📌 변제율·탕감률 계산 설명</h3>
    <p>총 부채 중 <strong>${repayRate}%</strong>는 실제로 갚아야 하는 금액이며, <strong>${reliefRate}%</strong>는 법원에서 탕감되는 금액입니다.</p>
    <p>최종 변제금의 현재가치(PV)는 <strong>${presentValue.toLocaleString()}원</strong>이며, 청산가치 <strong>${asset.toLocaleString()}원</strong>을 충족합니다.</p>
    ${autoAdjusted ? `<p style="color:#2a5f9e;">⚙️ PV 충족을 위해 변제금이 자동 조정되었습니다.</p>` : ""}
  `;
}

/****************************************************
 * 상세보기 토글
 ****************************************************/
function toggleAccordionRepay() {
  const box = $("repayAccordion");
  const btn = document.querySelector(".repay-accordion-btn");

  if (box.classList.contains("open")) {
    box.classList.remove("open");
    box.style.maxHeight = "0px";
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
function resetRepayInputs() {
  $("debt").value = "";
  $("income").value = "";
  $("extra").value = "";
  $("months").value = "36";
  $("asset").value = "";
  $("household").value = "1";

  updateLivingCost();

  $("repaySummary").style.display = "none";
  $("repayAccordion").innerHTML = "";
  $("repayExplain").innerHTML = "";
  $("repayExplain").style.display = "none";
}

/****************************************************
 * DOM 로드 후 초기 세팅
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {

  updateLivingCost();

  const householdEl = $("household");
  if (householdEl) {
    householdEl.addEventListener("change", updateLivingCost);
  }

  ["debt", "income", "living", "extra", "asset"].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", () => sanitizeNumberInput(el));
  });
});

/****************************************************
 * 모달 바깥 클릭 시 닫기
 ****************************************************/
["paywallOverlay", "loginRequiredModal"].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener("click", (e) => {
      if (e.target.id === id) {
        e.target.style.display = "none";
      }
    });
  }
});
window.calcRepay = calcRepay;
