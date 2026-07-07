pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

const pdfInput = document.getElementById("pdfFile");
const parseBtn = document.getElementById("parseBtn");
const statusEl = document.getElementById("status");
const tableBody = document.querySelector("#debtTable tbody");
const exportExcelBtn = document.getElementById("exportExcelBtn");
const flowContainer = document.getElementById("flowContainer");

let _rows = [];

function log(msg) {
  console.log(msg);
  statusEl.textContent = msg;
}

async function ocrPdf(file) {
  log("스캔본 OCR 시작...");
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    log(`페이지 ${pageNum} 렌더링 중...`);
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 5.5 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    const res = await fetch("https://us-central1-molawcounter.cloudfunctions.net/visionOCR", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64 })
    });
    const result = await res.json();
    fullText += `\n=== PAGE ${pageNum} ===\n` + result.text;
  }

  log("OCR 완료");
  return fullText;
}

function similarity(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  let matches = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) if (a[i] === b[i]) matches++;
  return matches / Math.max(a.length, b.length);
}

function normalize(str) {
  return str.replace(/\s+/g, "").replace(/[^가-힣A-Za-z0-9]/g, "");
}

function extractPhone(line) {
  const m = line.match(/\(?0\d{1,2}-\d{3,4}-\d{4}\)?/);
  return m ? m[0].replace(/[()]/g, "") : "-";
}

function parseCreditReport(text) {
  function splitSections(text) {
    const lines = text.split(/\r?\n/);
    const sections = {};
    let current = "기타";
    for (const line of lines) {
      const l = line.trim();
      if (l.includes("대출정보")) current = "대출정보";
      else if (l.includes("신용도판단정보") && l.includes("공공정보")) current = "변동분";
      else if (l.includes("공공정보")) current = "공공정보";
      else if (l.includes("채권자변동정보 조회서")) current = "채권자변동정보";
      else if (l.includes("연체채권의 채권자 변동 현황")) current = "연체변동";
      if (!sections[current]) sections[current] = [];
      sections[current].push(l);
    }
    return sections;
  }

  const CREDITORS = [
    "우리카드","케이비국민카드","신한카드","하나카드","현대카드",
    "삼성카드","롯데카드","비씨카드","기업은행","씨티은행",
    "농협은행","농협은행 의정부여신관리단","농업협동조합자산관리",
    "전북은행","부산은행","경남은행","카카오뱅크","토스뱅크",
    "상상인저축은행","웰컴저축은행","동원제일저축은행",
    "에스비아이저축은행","고려저축은행","예가람저축은행",
    "우리금융저축은행","다올저축은행","오케이저축은행",
    "키움저축은행","신한저축은행","엔에이치저축은행",
    "롯데캐피탈","케이비캐피탈","비엔케이캐피탈","하나캐피탈",
    "현대캐피탈","우리금융캐피탈","한국투자캐피탈",
    "리딩에이스캐피탈",
    "리드코프","웰릭스에프앤아이대부","아프로에프앤아이대부",
    "한빛자산관리대부","베리타스자산대부","애플자산관리대부",
    "엠메이드대부","에이원자산대부관리","아이앤유크레디트대부",
    "제니스자산관리대부","한국에셋채권대부",
    "고려신용정보","흥국생명보험","서울보증보험",
    "서민금융진흥원","소상공인시장진흥공단","신용보증기금",
    "국민행복기금","새도약기금","한국자산관리공사",
    "서울신용보증재단","경기신용보증재단","경북신용보증재단",
    "경남신용보증재단",
    "LGU+","SKT","KT","SK브로드밴드",
    "국세청 포천세무서","의정부지방법원","우리은행 여신관리부"
  ];

  function parseLoanInfo(lines) {
    const rows = [];
    for (const line of lines) {
      const clean = line.replace(/\s+/g, " ");
      const norm = normalize(clean);
      let bestMatch = null;
      let bestScore = 0;
      for (const c of CREDITORS) {
        const score = similarity(norm, normalize(c));
        if (score > bestScore) { bestScore = score; bestMatch = c; }
      }
      if (bestScore > 0.55) {
        const amountMatch = clean.match(/(\d{1,3}(,\d{3})*|\d+)\s*$/);
        const amount = amountMatch ? parseInt(amountMatch[1].replace(/,/g, ""), 10) : 0;
        rows.push({
          creditor: bestMatch,
          account: "-",
          type: "대출",
          amount,
          transfers: "-",
          repaid: "미변제",
          releaseReason: null,
          phone: extractPhone(clean)
        });
      }
    }
    return rows;
  }

  function parseJudgmentAndPublic(lines) {
    const rows = [];
    let currentCreditor = null;
    for (const line of lines) {
      const clean = line.replace(/\s+/g, " ");
      const norm = normalize(clean);
      let bestMatch = null;
      let bestScore = 0;
      for (const c of CREDITORS) {
        const score = similarity(norm, normalize(c));
        if (score > bestScore) { bestScore = score; bestMatch = c; }
      }
      if (bestScore > 0.55) {
        currentCreditor = bestMatch;
        continue;
      }
      if (!currentCreditor) continue;

      let type = null;
      if (clean.startsWith("등록")) type = "등록";
      else if (clean.startsWith("해제")) type = "해제";
      if (!type) continue;

      const accountMatch = clean.match(/\d{6,}/);
      const account = accountMatch ? accountMatch[0] : "-";
      const amountMatch = clean.match(/(\d{1,3}(,\d{3})*|\d+)\s*$/);
      const amount = amountMatch ? parseInt(amountMatch[1].replace(/,/g, ""), 10) : 0;

      let releaseReason = null;
      if (clean.includes("본인변제")) releaseReason = "본인변제";
      else if (clean.includes("회생계획인가결정")) releaseReason = "회생계획인가결정";
      else if (clean.includes("면책")) releaseReason = "면책";
      else if (clean.includes("기타")) releaseReason = "기타";

      rows.push({
        creditor: currentCreditor,
        account,
        type,
        amount,
        transfers: "-",
        repaid: releaseReason ? "해제됨" : "미변제",
        releaseReason,
        phone: extractPhone(clean)
      });
    }
    return rows;
  }

  function parseArrearChange(lines) {
    const rows = [];
    let currentCreditor = null;
    for (const line of lines) {
      const clean = line.replace(/\s+/g, " ");
      const norm = normalize(clean);
      let bestMatch = null;
      let bestScore = 0;
      for (const c of CREDITORS) {
        const score = similarity(norm, normalize(c));
        if (score > bestScore) { bestScore = score; bestMatch = c; }
      }
      if (bestScore > 0.55) {
        currentCreditor = bestMatch;
        continue;
      }
      if (!currentCreditor) continue;

      const isArrear =
        clean.includes("양수채권") ||
        clean.includes("대위변제") ||
        clean.includes("일반대출") ||
        clean.includes("매각");

      if (!isArrear) continue;

      const principalMatch = clean.match(/(\d{1,3}(,\d{3})*|\d+)\s*$/);
      const principal = principalMatch ? parseInt(principalMatch[1].replace(/,/g, ""), 10) : 0;

      let transfers = [];
      if (clean.includes("매각")) transfers.push("매각");
      if (clean.includes("미양도")) transfers.push("미양도");
      if (clean.includes("개인회생")) transfers.push("개인회생");
      if (clean.includes("대위변제")) transfers.push("대위변제");

      rows.push({
        creditor: currentCreditor,
        account: "-",
        type: "연체변동",
        amount: principal,
        transfers: transfers.length ? transfers.join(" / ") : "-",
        repaid: "미변제",
        releaseReason: null,
        phone: extractPhone(clean)
      });
    }
    return rows;
  }

  function isFullyRepaid(group) {
    return group.some(r => r.releaseReason === "본인변제");
  }

  function findBuyer(allRows, sellerCreditor) {
    return allRows.find(r =>
      r.creditor !== sellerCreditor &&
      r.type === "연체변동"
    );
  }

  function convertTransferFormat(group, allRows) {
    const creditor = group[0].creditor;
    const transfers = group
      .map(r => r.transfers)
      .filter(Boolean)
      .filter(t => t !== "-");
    if (!transfers.length) return "-";

    return transfers
      .map(t => {
        if (t.includes("매각")) {
          const buyer = findBuyer(allRows, creditor);
          return buyer ? `${creditor} → ${buyer.creditor}` : `${creditor} → (매각)`;
        }
        if (t.includes("미양도")) return `${creditor} → (미양도)`;
        if (t.includes("대위변제")) return `${creditor} → (대위변제)`;
        if (t.includes("개인회생")) return `${creditor} → (개인회생)`;
        return `${creditor} → (${t})`;
      })
      .join(" / ");
  }

  function postProcess(rows) {
    const byKey = new Map();
    for (const row of rows) {
      const creditor = row.creditor || "채권사모름";
      const account = row.account || "-";
      const key = `${creditor}::${account}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push({ ...row, creditor, account });
    }

    const result = [];

    for (const [key, group] of byKey.entries()) {
      const [creditor, account] = key.split("::");
      const hasRegister = group.some(r => r.type === "대출" || r.type === "등록");
      const hasRelease = group.some(r => r.type === "해제");
      const fullyRepaid = isFullyRepaid(group);

      if (account !== "-" && fullyRepaid) continue;
      if (account !== "-" && !hasRegister && hasRelease) continue;

      if (account === "-") {
        if (result.some(r => r.creditor === creditor && r.account === "-")) continue;
      }

      let transfers = convertTransferFormat(group, rows);
      const repaid = fullyRepaid ? "해제됨" : "미변제";

      if (transfers.includes("→")) {
        const [seller, buyer] = transfers.split("→").map(s => s.trim());
        if (buyer && seller === creditor) {
          continue;
        }
        if (buyer && creditor === buyer) {
          transfers = `${seller}(매각) → ${buyer}`;
        }
      }

      result.push({
        creditor,
        phone: group[0].phone || "-",
        account: account === "-" ? "-" : account,
        transfers,
        repaid
      });
    }

    result.sort((a, b) => {
      if (a.creditor < b.creditor) return -1;
      if (a.creditor > b.creditor) return 1;
      if (a.account < b.account) return -1;
      if (a.account > b.account) return 1;
      if (a.repaid === "미변제" && b.repaid === "해제됨") return -1;
      if (a.repaid === "해제됨" && b.repaid === "미변제") return 1;
      return 0;
    });

    return result;
  }

  const sections = splitSections(text);
  const loanRows = parseLoanInfo(sections["대출정보"] || []);
  const judgmentRows = parseJudgmentAndPublic(sections["변동분"] || []);
  const publicRows = parseJudgmentAndPublic(sections["공공정보"] || []);
  const arrearRows = parseArrearChange(sections["연체변동"] || []);
  const allRows = [...loanRows, ...judgmentRows, ...publicRows, ...arrearRows];

  return postProcess(allRows);
}

parseBtn.addEventListener("click", async () => {
  const file = pdfInput.files && pdfInput.files[0];
  if (!file) {
    alert("PDF 파일을 선택하세요.");
    return;
  }

  tableBody.innerHTML = "";
  statusEl.textContent = "OCR 처리 중...";

  let fullText = "";
  try {
    fullText = await ocrPdf(file);
  } catch (e) {
    statusEl.textContent = "OCR 오류: " + e.message;
    return;
  }

  const rows = parseCreditReport(fullText);
  _rows = rows;

  renderTable(rows);
  renderFlowMap(rows);

  statusEl.textContent = `완료: 표가 생성되었습니다. (총 ${rows.length}건)`;
});

function renderTable(rows) {
  tableBody.innerHTML = "";
  rows.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.creditor}</td>
      <td><a href="tel:${row.phone}" class="phone-link">${row.phone}</a></td>
      <td>${row.account}</td>
      <td>${row.transfers}</td>
      <td>${row.repaid}</td>
    `;
    tableBody.appendChild(tr);
  });
}

function renderFlowMap(rows) {
  flowContainer.innerHTML = "";

  rows.forEach(r => {
    if (r.transfers && r.transfers.includes("→")) {
      const div = document.createElement("div");
      div.className = "flow-item";
      div.innerHTML = `
        <span class="flow-creditor">${r.creditor}</span>
        <span class="flow-arrow">→</span>
        <span class="flow-target">${r.transfers.split("→")[1].trim()}</span>
        <span class="flow-account">(${r.account})</span>
      `;
      flowContainer.appendChild(div);
    }
  });
}

exportExcelBtn.addEventListener("click", () => {
  if (!_rows.length) {
    alert("먼저 PDF를 분석하세요.");
    return;
  }

  const data = _rows.map(row => ({
    채권사: row.creditor,
    채권사전화번호: row.phone,
    계좌번호_사건번호: row.account,
    양도양수이력: row.transfers,
    채무변제여부: row.repaid
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "채권현황");
  XLSX.writeFile(wb, "채권현황.xlsx");
});
