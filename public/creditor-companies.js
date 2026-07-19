/* ============================================================
   채권사 정보 추출 + alive 판정 + Firestore 저장 (v9)
============================================================ */

import { app, db } from "./firebase-init.js";
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

let _rows = [];          // 모든 row (채권사별 상세)
let _creditors = [];     // 채권사별 요약 + alive

// ===================== 로그 =====================
function log(msg) {
  console.log(msg);
  statusEl.textContent = msg;
}

// ===================== PDF → base64 (원본) =====================
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
  log("Firebase Functions(docAI) 호출 중...");

  const res = await fetch("/docAI", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64 })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`docAI 호출 실패: ${res.status} ${text}`);
  }

  const result = await res.json();
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

  if (/연체|변동|연체변동/i.test(header)) return "연체변동";
  if (/등록|공공정보|신용정보/i.test(header)) return "등록";
  if (/대출|원리금|상환/i.test(header)) return "대출";
  if (/보증|서울보증|대위변제/i.test(header)) return "보증";

  return "기타";
}

// Document AI → row 리스트
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

// ===================== alive 판정 (true/false만 계산, 필터링 X) =====================
function normalize(str) {
  return (str || "")
    .replace(/\s+/g, "")
    .replace(/[^가-힣A-Za-z0-9]/g, "")
    .trim();
}

// name → alive(boolean) 맵 생성
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

    // 기존 로직을 그대로 사용해 alive true/false만 판정
    let alive = true;

    // 1) 연체변동만 있고, 양수/대위변제도 없으면 → 양도인 → alive = false
    if (hasOnlyArrear && !hasLoanOrRegister && !hasAcquisition) {
      alive = false;
    }

    aliveMap.set(nameKey, alive);
  }

  return aliveMap;
}

// 채권사별 요약 배열 생성
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
// creditor_companies 컬렉션에 upsert
async function saveCreditorsToFirestore(creditors) {
  log("Firestore 저장 중...");

  const colRef = collection(db, "creditor_companies");

  for (const c of creditors) {
    const docId = c.nameKey || c.name || crypto.randomUUID();

    const docRef = doc(colRef, docId);

    // 최소 필드: name, alive, is_active, createdAt/updatedAt
    // 나중에 필요한 필드는 추가로 확장 가능
    const data = {
      name: c.name,
      alive: c.alive,          // 요청: alive true/false 저장
      is_active: c.alive,      // 스키마의 is_active(살아있는 채권사 여부)와 동일하게 사용
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

  statusEl.textContent = "PDF 처리 중...";

  try {
    const base64 = await fileToBase64(file);   // PDF 원본 그대로 base64
    const document = await callDocumentAI(base64);

    const rows = buildRowsFromDocumentAI(document);
    _rows = rows;

    const creditors = buildCreditorsSummary(rows);
    _creditors = creditors;

    renderTable(creditors);
    statusEl.textContent = `완료 (${creditors.length}개 채권사, alive 판정 포함)`;
  } catch (e) {
    console.error(e);
    statusEl.textContent = "오류: " + e.message;
  }
});

// Firestore 저장 버튼
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
