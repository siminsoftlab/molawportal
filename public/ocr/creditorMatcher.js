// creditorMatcher.js
import { getFirestore, collection, getDocs, doc, setDoc } from "firebase/firestore";

const db = getFirestore();

// 텍스트에서 채권사 이름 추출
function extractCreditorsFromText(text, creditorList) {
  const found = [];

  for (const creditor of creditorList) {
    if (text.includes(creditor.name)) {
      found.push(creditor);
    }
  }

  return found;
}

// alive 판정
function filterAliveCreditors(creditors) {
  return creditors.filter(c => c.is_active === true);
}

// 채무자 DB에 저장
async function saveDebtorCreditors(debtorId, aliveCreditors) {
  for (const creditor of aliveCreditors) {
    await setDoc(
      doc(db, "debtor_creditors", `${debtorId}_${creditor.id}`),
      {
        debtor_id: debtorId,
        creditor_id: creditor.id,
        name: creditor.name,
        is_active: creditor.is_active,
        created_at: new Date()
      }
    );
  }
}

// 전체 자동화 실행
export async function matchCreditors(text, debtorId) {
  // 1) creditor_companies 전체 불러오기
  const snapshot = await getDocs(collection(db, "creditor_companies"));
  const creditorList = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // 2) 텍스트에서 등장한 채권사 자동 추출
  const foundCreditors = extractCreditorsFromText(text, creditorList);

  // 3) is_active = true인 채권사만 alive
  const aliveCreditors = filterAliveCreditors(foundCreditors);

  // 4) 채무자 DB에 저장
  await saveDebtorCreditors(debtorId, aliveCreditors);

  return aliveCreditors;
}
