/* ============================================================
   채권사 정보 추출 + alive 판정 + Firestore 저장 (v9)
   + PDF 페이지 진행률 표시 기능 포함
============================================================ */

import { app, db } from "/firebase-init.js";
import {
  collection,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// ===================== PDF.js 설정 =====================
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

const pdfInput = document.getElementById("pdfFile");
const parseBtn = document.getElementById("parseBtn");
const statusEl = document.getElementById("status");
const tableBody = document.querySelector("#creditorTable tbody");
const saveBtn = document.getElementById("saveToFirestoreBtn");

let _rows = [];
let _creditors = [];

// ===================== 로그 =====================
function log(msg) {
  console.log(msg);
  statusEl.textContent = msg;
}

// ===================== PDF → base64 + 페이지 진행률 =====================
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
// ===================== Cloud Functions(docAI) 호출 =====================
async function callDocumentAI(base64) {
  log("Document AI 호출 중...");

  const res = await fetch("https://us-central1-molawcounter.cloudfunctions.net/docAI2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64 })
  });

  const text = await res.text();
  console.log("docAI2 raw response:", text);

  let result;
  try {
    result = JSON.parse(text);
  } catch (e) {
    throw new Error("docAI2 응답이 JSON이 아닙니다: " + text);
  }

  if (!result || !result.document) {
    throw new Error("docAI2 응답에 document가 없습니다: " + JSON.stringify(result));
  }

  return result.document;
}


// ===================== Document AI 응답 → 테이블 추출 =====================
function extractTables(document) {
  const tables = [];
  for (const page of document.pages || []) {
    for (const table of page.tables || []) {
      tables.push(table);
    }
  }
  return tables;
}

function cellText(cell) {
  if (cell.layout?.textAnchor?.content) {
    return cell.layout.textAnchor.content.trim();
  }
  if (cell.textAnchor?.content) {
    return cell.textAnchor.content.trim();
  }
  return "";
}

function detectSection(table) {
  const header = (table.headerRows || [])
    .flatMap(r => r.cells || [])
    .map(c => cellText(c))
    .join(" ");

  if (/연체|변동/i.test(header)) return "연체변동";
  if (/등록|공공정보/i.test(header)) return "등록";
  if (/대출|원리금/i.test(header)) return "대출";
  if (/보증|대위변제/i.test(header)) return "보증";

  return "기타";
}

function buildRowsFromDocumentAI(document) {
  const tables = extractTables(document);
  const rows = [];

  for (const table of tables) {
    const sectionType = detectSection(table);

    for (const row of table.bodyRows || []) {
      const cells = row.cells || [];
      const texts = cells.map(cellText);

      if (!texts.length) continue;

      rows.push({
        creditor: texts[0] || "",
        account: texts[1] || "-",
        loanType: texts[2] || "-",
        transfers: texts[3] || "-",
        repaid: texts[4] || "미변제",
        sectionType
      });
    }
  }

  return rows;
}

// ===================== alive 판정 =====================
function normalize(str) {
  return (str || "")
    .replace(/\s+/g, "")
    .replace(/[^가-힣A-Za-z0-9]/g, "")
    .trim();
}

function computeAliveMap(rows) {
  const byName = new Map();

  for (const r of rows) {
    const nameKey = normalize(r.creditor);
    if (!nameKey) continue;

    if (!byName.has(nameKey)) byName.set(nameKey, []);
    byName.get(nameKey).push(r);
  }

  const aliveMap = new Map();

  for (const [nameKey, list] of byName.entries()) {
    const hasLoanOrRegister = list.some(r =>
      r.sectionType === "대출" ||
      r.sectionType === "등록" ||
      r.sectionType === "보증"
    );

    const hasOnlyArrear = list.every(r => r.sectionType === "연체변동");

    const hasAcquisition = list.some(r =>
      (r.transfers || "").includes("양수") ||
      (r.transfers || "").includes("대위변제")
    );

    let alive = true;

    if (hasOnlyArrear && !hasLoanOrRegister && !hasAcquisition) {
      alive = false;
    }

    aliveMap.set(nameKey, alive);
  }

  return aliveMap;
}

function buildCreditorsSummary(rows) {
  const aliveMap = computeAliveMap(rows);
  const byName = new Map();

  for (const r of rows) {
    const nameKey = normalize(r.creditor);
    if (!nameKey) continue;

    if (!byName.has(nameKey)) byName.set(nameKey, []);
    byName.get(nameKey).push(r);
  }

  const creditors = [];

  for (const [nameKey, list] of byName.entries()) {
    const first = list[0];
    creditors.push({
      nameKey,
      name: first.creditor,
      account: first.account,
      loanType: first.loanType,
      transfers: first.transfers,
      repaid: first.repaid,
      alive: aliveMap.get(nameKey) ?? true,
      rows: list
    });
  }

  return creditors;
}

// ===================== 테이블 렌더링 =====================
function renderTable(creditors) {
  tableBody.innerHTML = "";

  creditors.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${item.account}</td>
      <td>${item.loanType}</td>
      <td>${item.transfers}</td>
      <td>${item.repaid}</td>
      <td>${item.alive}</td>
    `;
    tableBody.appendChild(tr);
  });
}

// ===================== Firestore 저장 =====================
async function saveCreditorsToFirestore(creditors) {
  log("Firestore 저장 중...");

  const colRef = collection(db, "creditor_companies");

  for (const c of creditors) {
    const docId = c.nameKey || c.name || crypto.randomUUID();
    const docRef = doc(colRef, docId);

    const data = {
      name: c.name,
      alive: c.alive,
      is_active: c.alive,
      account_sample: c.account,
      loan_type_sample: c.loanType,
      transfers_sample: c.transfers,
      repaid_sample: c.repaid,
      updated_at: serverTimestamp(),
      created_at: serverTimestamp()
    };

    await setDoc(docRef, data, { merge: true });
  }

  log(`Firestore 저장 완료 (총 ${creditors.length}개 채권사)`);
}

// ===================== 실행 =====================
parseBtn.addEventListener("click", async () => {
  const file = pdfInput.files?.[0];
  if (!file) {
    alert("PDF 파일을 선택하세요.");
    return;
  }

  try {
    log("PDF 처리 시작...");

    const base64 = await fileToBase64(file);   // ⭐ PDF 원본 base64
    const document = await callDocumentAI(base64);

    const rows = buildRowsFromDocumentAI(document);
    _rows = rows;

    const creditors = buildCreditorsSummary(rows);
    _creditors = creditors;

    renderTable(creditors);
    log(`완료 (${creditors.length}개 채권사, alive 판정 포함)`);
  } catch (e) {
    console.error(e);
    log("오류: " + e.message);
  }
});

// ===================== Firestore 저장 버튼 =====================
saveBtn.addEventListener("click", async () => {
  if (!_creditors.length) {
    alert("먼저 PDF를 분석해서 채권사를 추출하세요.");
    return;
  }

  try {
    await saveCreditorsToFirestore(_creditors);
    alert("Firestore 저장 완료!");
  } catch (e) {
    console.error(e);
    alert("Firestore 저장 중 오류: " + e.message);
  }
});
