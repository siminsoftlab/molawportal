// creditorMatcher.js
import { db } from "/firebase-init.js";
import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

export async function matchCreditors(text, debtorId) {
  // ⭐ creditorData/latest 문서 읽기
  const docSnap = await getDoc(doc(db, "creditorData", "latest"));

  if (!docSnap.exists()) {
    console.error("creditorData/latest 문서가 없습니다.");
    return [];
  }

  // ⭐ 실제 채권사 목록
  const creditorList = docSnap.data().creditors || [];

  // ⭐ 텍스트에서 채권사 이름 매칭
  const found = creditorList.filter(c => {
    const name = (c.name || "").replace(/\s+/g, "");
    const normalizedText = text.replace(/\s+/g, "");
    return normalizedText.includes(name);
  });

  // ⭐ is_active가 없으므로 모두 alive 처리
  const alive = found.map(c => ({
    creditor_id: c.account || "-",
    name: c.name,
    account: c.account || "-",
    registeredAmount: c.registeredAmount || null,
    overdueAmount: c.overdueAmount || null,
    releaseReason: c.releaseReason || null
  }));

  // ⭐ debtor_creditors DB 저장
  for (const creditor of alive) {
    await setDoc(
      doc(db, "debtor_creditors", `${debtorId}_${creditor.name}`),
      {
        debtor_id: debtorId,
        creditor_name: creditor.name,
        account: creditor.account,
        registeredAmount: creditor.registeredAmount,
        overdueAmount: creditor.overdueAmount,
        releaseReason: creditor.releaseReason,
        created_at: new Date()
      }
    );
  }

  return alive;
}
