/****************************************************
 * 법원 생계비 자동 계산 (가구 수 기반)
 ****************************************************/

function calcCourtLiving(household) {
  const baseLiving1 = 1538523;  // 1인 기준 법원 생계비
  const weights = {
    1: 1.0,
    2: 1.5,
    3: 2.1,
    4: 2.6,
    5: 3.1
  };
  return Math.round(baseLiving1 * (weights[household] || 1));
}

/****************************************************
 * repay.js 계산 시작 시 자동 생계비 반영
 ****************************************************/
function updateLivingCost() {
  const household = Number(document.getElementById("household").value || 1);
  const living = calcCourtLiving(household);
  document.getElementById("living").value = living;
}

/****************************************************
 * 초기화 시에도 자동 생계비 반영
 ****************************************************/
function resetRepayInputs() {
  document.getElementById("debt").value = "";
  document.getElementById("income").value = "";
  document.getElementById("extra").value = "";
  document.getElementById("months").value = "36";
  document.getElementById("asset").value = "";
  document.getElementById("household").value = "1";

  updateLivingCost(); // 자동 생계비 반영

  document.getElementById("repaySummary").style.display = "none";
  document.getElementById("repayAccordion").innerHTML = "";
  document.getElementById("repayExplain").innerHTML = "";
}

/****************************************************
 * 페이지 로드 시 자동 생계비 계산
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  updateLivingCost();

  // 가구 수 변경 시 자동 반영
  const householdSelect = document.getElementById("household");
  if (householdSelect) {
    householdSelect.addEventListener("change", updateLivingCost);
  }
});
