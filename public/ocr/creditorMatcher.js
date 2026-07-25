import { db } from "/firebase-init.js";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/* ---------------------------
   1) baseName 자동 추출
---------------------------- */
function extractBaseName(fullName) {
  const keywords = [
    "은행",
    "카드",
    "캐피탈",
    "저축은행",
    "대부",
    "파이낸셜",
    "보증보험"
  ];

  for (const keyword of keywords) {
    const idx = fullName.indexOf(keyword);
    if (idx !== -1) {
      return fullName.substring(0, idx + keyword.length);
    }
  }

  return fullName;
}

/* ---------------------------
   2) 카테고리 자동 분류
---------------------------- */
function extractCategory(baseName) {
  if (baseName.includes("은행")) return "은행";
  if (baseName.includes("카드")) return "카드";
  if (baseName.includes("캐피탈")) return "캐피탈";
  if (baseName.includes("저축은행")) return "저축은행";
  if (baseName.includes("대부")) return "대부업체";
  if (baseName.includes("보증보험")) return "보증보험";
  if (baseName.includes("파이낸셜")) return "파이낸셜";
  return "기타";
}

/* ---------------------------
   3) 연락처 자동 매칭
---------------------------- */
function extractPhone(baseName) {
  const phoneMap = {
    "신한은행": "1577-8000",
    "KB국민카드": "1588-1688",
    "삼성카드": "1588-8700",
    "케이비저축은행": "1877-9900",
    "서울보증보험": "1670-7000",
    "농협은행": "1661-3000",
    "하나캐피탈": "1800-1110",
    "아프로에프앤아이대부": "1800-1111",
    "한빛자산관리대부": "02-000-0000",
    "우담자산관리대부": "02-000-0000",
    "제니스자산관리대부": "02-000-0000",
    "엘하비스트대부": "02-000-0000",
    "저스트인타임대부": "02-000-0000",
    "아이앤유크레디트대부": "02-000-0000"
  };

  return phoneMap[baseName] || "-";
}

/* ---------------------------
   4) 대출종류 자동 분류
---------------------------- */
function extractLoanType(fullName) {
  if (fullName.includes("주택담보")) return "주택담보";
  if (fullName.includes("신용대출")) return "신용대출";
  if (fullName.includes("연체")) return "연체";
  if (fullName.includes("담보")) return "담보";
  if (fullName.includes("통합")) return "통합";
  if (fullName.includes("여신")) return "여신관리";
  return "-";
}

/* ---------------------------
   5) 부서명 자동 분리
---------------------------- */
function extractDepartment(fullName) {
  const deptKeywords = [
    "여신관리부",
    "마케팅부",
    "영업부",
    "본점",
    "금융센터",
    "봉선동",
    "광산금융센터"
  ];

  for (const keyword of deptKeywords) {
    if (fullName.includes(keyword)) return keyword;
  }
  return "-";
}

/* ---------------------------
   6) 담보 여부 자동 분류
---------------------------- */
function extractCollateral(fullName) {
  return fullName.includes("담보");
}

/* ---------------------------
   7) 계좌번호 자동 추출
---------------------------- */
function extractAccountNumber(text) {
  const accountRegex = /\b\d{10,}\b/g;
  const matches = text.match(accountRegex);
  return matches ? matches[0] : "-";
}

/* ---------------------------
   8) 이름 매칭
---------------------------- */
function matchName(text, creditor) {
  const normalizedText = text.replace(/\s+/g, "");

  const baseName = creditor.name.replace(/\s+/g, "");
  if (normalizedText.includes(baseName)) return true;

  if (creditor.aliases) {
    return creditor.aliases.some(alias => {
      const normalizedAlias = alias.replace(/\s+/g, "");
      return normalizedText.includes(normalizedAlias);
    });
  }

  return false;
}

/* ---------------------------
   9) 새로운 채권사 자동 추가
---------------------------- */
async function addNewCreditor(fullName) {
  const latestRef = doc(db, "creditorData", "latest");
  const snap = await getDoc(latestRef);
  if (!snap.exists()) return;

  const list = snap.data().creditors || [];
  const baseName = extractBaseName(fullName);

  const exists = list.some(c => c.name === baseName);

  if (exists) {
    const updated = list.map(c => {
      if (c.name === baseName) {
        const aliases = c.aliases || [];
        if (!aliases.includes(fullName)) {
          return { ...c, aliases: [...aliases, fullName] };
        }
      }
      return c;
    });

    await updateDoc(latestRef, { creditors: updated });
    return;
  }

  const newCreditor = {
    name: baseName,
    aliases: [fullName],
    category: extractCategory(baseName),
    phone: extractPhone(baseName),
    account: "-",
    registeredAmount: null,
    overdueAmount: null,
    releaseReason: null
  };

  await updateDoc(latestRef, {
    creditors: [...list, newCreditor]
  });
}

/* ---------------------------
   10) 최종 매칭 엔진
---------------------------- */
export async function matchCreditors(text, debtorId) {
  const latestRef = doc(db, "creditorData", "latest");
  const snap = await getDoc(latestRef);
  const creditorList = snap.data().creditors || [];

  const normalizedText = text.replace(/\s+/g, "");
  const foundMap = {};

  const accountNumber = extractAccountNumber(text);

  // 기존 채권사 매칭
  for (const c of creditorList) {
    if (matchName(normalizedText, c)) {
      const baseName = c.name;

      foundMap[baseName] = {
        ...c,
        loanType: extractLoanType(c.name),
        department: extractDepartment(c.name),
        collateral: extractCollateral(c.name),
        account: accountNumber
      };
    }
  }

  // 새로운 채권사 탐지
  const words = text.split(/\s+/);

  for (const fullName of words) {
    if (!/(은행|카드|캐피탈|저축은행|대부|파이낸셜|보증보험)/.test(fullName)) continue;

    const baseName = extractBaseName(fullName);

    if (!foundMap[baseName]) {
      await addNewCreditor(fullName);

      foundMap[baseName] = {
        name: baseName,
        aliases: [fullName],
        category: extractCategory(baseName),
        phone: extractPhone(baseName),
        account: accountNumber,
        loanType: extractLoanType(fullName),
        department: extractDepartment(fullName),
        collateral: extractCollateral(fullName),
        registeredAmount: null,
        overdueAmount: null,
        releaseReason: null
      };
    }
  }

  const found = Object.values(foundMap);

  // debtor_creditors 저장
  for (const creditor of found) {
    await setDoc(
      doc(db, "debtor_creditors", `${debtorId}_${creditor.name}`),
      {
        debtor_id: debtorId,
        creditor_name: creditor.name,
        aliases: creditor.aliases || [],
        category: creditor.category,
        phone: creditor.phone,
        account: creditor.account,
        loanType: creditor.loanType,
        department: creditor.department,
        collateral: creditor.collateral,
        registeredAmount: creditor.registeredAmount || null,
        overdueAmount: creditor.overdueAmount || null,
        releaseReason: creditor.releaseReason || null,
        created_at: new Date()
      }
    );
  }

  return found;
}
