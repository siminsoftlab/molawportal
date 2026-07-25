import { db } from "/firebase-init.js";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

function extractBaseName(fullName) {
  const keywords = [
    "은행",
    "카드",
    "캐피탈",
    "저축은행",
    "대부",
    "파이낸셜",
    "금융",
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

async function addNewCreditor(fullName) {
  const latestRef = doc(db, "creditorData", "latest");
  const snap = await getDoc(latestRef);
  if (!snap.exists()) return;

  const list = snap.data().creditors || [];

  const baseName = extractBaseName(fullName);

  const exists = list.some(c => c.name === baseName);
  if (exists) {
    // 기존 채권사에 alias만 추가
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

  // 새로운 채권사 추가
  const newCreditor = {
    name: baseName,
    aliases: [fullName],
    account: "-",
    registeredAmount: null,
    overdueAmount: null,
    releaseReason: null
  };

  await updateDoc(latestRef, {
    creditors: [...list, newCreditor]
  });
}

export async function matchCreditors(text, debtorId) {
  const latestRef = doc(db, "creditorData", "latest");
  const snap = await getDoc(latestRef);
  const creditorList = snap.data().creditors || [];

  const normalizedText = text.replace(/\s+/g, "");

  const found = [];

  // 1) 기존 채권사 매칭
  for (const c of creditorList) {
    if (matchName(normalizedText, c)) {
      found.push(c);
    }
  }

  // 2) 텍스트에서 새로운 채권사 후보 탐지
  const words = text.split(/\s+/);
  const candidates = words.filter(w =>
    /(은행|카드|캐피탈|저축은행|대부|파이낸셜|보증보험)/.test(w)
  );

  for (const fullName of candidates) {
    const baseName = extractBaseName(fullName);
    const exists = creditorList.some(c => c.name === baseName);

    if (!exists) {
      await addNewCreditor(fullName);

      found.push({
        name: baseName,
        aliases: [fullName],
        account: "-",
        registeredAmount: null,
        overdueAmount: null,
        releaseReason: null
      });
    }
  }

  // 3) debtor_creditors 저장
  for (const creditor of found) {
    await setDoc(
      doc(db, "debtor_creditors", `${debtorId}_${creditor.name}`),
      {
        debtor_id: debtorId,
        creditor_name: creditor.name,
        aliases: creditor.aliases || [],
        account: creditor.account || "-",
        registeredAmount: creditor.registeredAmount || null,
        overdueAmount: creditor.overdueAmount || null,
        releaseReason: creditor.releaseReason || null,
        created_at: new Date()
      }
    );
  }

  return found;
}
