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

function resetAssetEmphasis() {
  document.getElementById('ae_income').value = "";
  document.getElementById('ae_living').value = "";
  document.getElementById('ae_extra').value = "";
  document.getElementById('ae_months').value = "36";
  document.getElementById('ae_asset').value = "";

  document.getElementById('ae_summary').style.display = "none";
  document.getElementById('ae_accordion').style.display = "none";

  const seo = document.getElementById('ae_seo');
  seo.classList.remove('visible');
  seo.innerHTML = "";
}

function calcAssetEmphasis() {
  const income = Number(document.getElementById('ae_income').value || 0);
  const living = Number(document.getElementById('ae_living').value || 0);
  const extra  = Number(document.getElementById('ae_extra').value || 0);
  const months = Number(document.getElementById('ae_months').value || 0);
  const asset  = Number(document.getElementById('ae_asset').value || 0);

  const totalLiving = living + extra;
  const disposable = Math.max(income - totalLiving, 0);
  const totalByIncome = disposable * months;

  const finalTotal = Math.max(totalByIncome, asset);
  const monthly = months > 0 ? Math.ceil(finalTotal / months) : 0;

  const isAssetDominant = asset > totalByIncome;

  const summary = document.getElementById('ae_summary');
  summary.innerHTML = `
    총 변제금: ${finalTotal.toLocaleString()}원<br>
    월 변제금: ${monthly.toLocaleString()}원<br>
    ${isAssetDominant 
      ? `<span style="font-size:16px;">(청산가치 기준으로 결정됨)</span>` 
      : `<span style="font-size:16px;">(소득 기준으로 결정됨)</span>`}
  `;
  summary.style.display = "block";

  const acc = document.getElementById('ae_accordion');
  acc.innerHTML = `
    <div class="calc-step"><strong>월 소득</strong><br>${income.toLocaleString()}원</div>
    <div class="calc-step"><strong>총 생계비</strong><br>${totalLiving.toLocaleString()}원</div>
    <div class="calc-step"><strong>월 변제 가능 금액</strong><br>${disposable.toLocaleString()}원</div>
    <div class="calc-step"><strong>총 변제금(소득 기준)</strong><br>${totalByIncome.toLocaleString()}원</div>
    <div class="calc-step"><strong>청산가치</strong><br>${asset.toLocaleString()}원</div>
    <div class="calc-step"><strong>최종 총 변제금</strong><br>${finalTotal.toLocaleString()}원</div>
    <div class="calc-step"><strong>월 변제금</strong><br>${monthly.toLocaleString()}원</div>
  `;
  acc.style.display = "block";

  const seo = document.getElementById('ae_seo');
  seo.innerHTML = `
    <h3>📌 청산가치 자동 강조 설명</h3>
    <p>소득 기준 변제금은 ${totalByIncome.toLocaleString()}원이며, 청산가치는 ${asset.toLocaleString()}원입니다.</p>
    <p>두 값 중 더 큰 금액인 ${finalTotal.toLocaleString()}원이 최종 변제금으로 결정됩니다.</p>
  `;
  setTimeout(() => seo.classList.add('visible'), 50);
}
