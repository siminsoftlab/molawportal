// creditorMatcher.js
import { db } from "/firebase-init.js";
import {
  collection,
  getDocs,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

export async function matchCreditors(text, debtorId) {
  // ⭐ Firestore 컬렉션 이름 수정
  const snapshot = await getDocs(collection(db, "creditorData"));

  const creditorList = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  const found = creditorList.filter(c => text.includes(c.name));
  const alive = found.filter(c => c.is_active);

  for (const creditor of alive) {
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

  return alive;
}
