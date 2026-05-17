function toggleAccordion(contentId, btnId) {
  const box = document.getElementById(contentId);
  const btn = document.getElementById(btnId);
  if (box.style.display === "block") {
    box.style.display = "none";
    btn.textContent = "계산 상세 보기 ▼";
  } else {
    box.style.display = "block";
    btn.textContent = "계산 상세 접기 ▲";
  }
}

function resetHouseholdLiving() {
  document.getElementById('hl_income').value = "";
  document.getElementById('hl_household').value = "1";
  document.getElementById('hl_extra').value = "";
  document.getElementById('hl_months').value = "36";
  document.getElementById('hl_asset').value = "";

  document.getElementById('hl_summary').style.display = "none";
  document.getElementById('hl_accordion').style.display = "none";

  const seo = document.getElementById('hl_seo');
  seo.classList.remove('visible');
  seo.innerHTML = "";
}

function calcHouseholdLiving() {
  const income = Number(document.getElementById('hl_income').value || 0);
  const household = Number(document.getElementById('hl_household').value || 1);
  const extra = Number(document.getElementById('hl_extra').value || 0);
  const months = Number(document.getElementById('hl_months').value || 0);
  const asset = Number(document.getElementById('hl_asset').value || 0);

  const baseLiving1 = 1538523;
  const weights = {1:1.0, 2:1.5, 3:2.1, 4:2.6, 5:3.1};
  const living = Math.round(baseLiving1 * (weights[household] || 1));

  const totalLiving = living + extra;
  const disposable = Math.max(income - totalLiving, 0);
  const totalByIncome = disposable * months;
  const finalTotal = Math.max(totalByIncome, asset);
  const monthly = months > 0 ? Math.ceil(finalTotal / months) : 0;

  const summary = document.getElementById('hl_summary');
  summary.innerHTML = `
    총 변제금: ${finalTotal.toLocaleString()}원<br>
    월 변제금: ${monthly.toLocaleString()}원
