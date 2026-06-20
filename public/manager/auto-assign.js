import { db } from "/firebase-init.js";
import {
  collection, query, where, getDocs, doc, updateDoc, orderBy, limit
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// ⭐ 상담 자동 배정 함수
export async function autoAssignCustomer(consultId, customerTags = []) {

  // 1) 활성 매니저 목록 불러오기
  const q = query(
    collection(db, "users"),
    where("role", "==", "manager"),
    where("active", "==", true)
  );

  const snap = await getDocs(q);
  if (snap.empty) {
    alert("배정 가능한 매니저가 없습니다.");
    return null;
  }

  let managers = snap.docs.map(doc => ({
    uid: doc.id,
    ...doc.data()
  }));

  // 2) 태그 기반 우선 배정
  if (customerTags.length > 0) {
    const skilledManagers = managers.filter(m =>
      m.skills?.some(skill => customerTags.includes(skill))
    );

    if (skilledManagers.length > 0) {
      managers = skilledManagers;
    }
  }

  // 3) 상담 건수(currentLoad)가 가장 적은 매니저 선택
  managers.sort((a, b) => (a.currentLoad || 0) - (b.currentLoad || 0));
  const selected = managers[0];

  // 4) 상담 문서에 배정
  const consultRef = doc(db, "consult_requests", consultId);
  await updateDoc(consultRef, {
    assignedTo: selected.uid,
    status: "배정",
    assignedAt: new Date()
  });

  // 5) 매니저 currentLoad +1
  const managerRef = doc(db, "users", selected.uid);
  await updateDoc(managerRef, {
    currentLoad: (selected.currentLoad || 0) + 1
  });

  return selected.uid;
}
