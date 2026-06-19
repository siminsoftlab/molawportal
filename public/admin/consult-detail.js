// consult-detail.js
import { db, storage } from "/firebase-init.js";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

document.addEventListener("DOMContentLoaded", async () => {

  /* ------------------------------
      1. URL에서 문서 ID 가져오기
  ------------------------------ */
  const params = new URLSearchParams(location.search);
  const id = params.get("id");

  if (!id) {
    alert("잘못된 접근입니다.");
    location.href = "/admin/admin-consult.html";
    return;
  }

  const refDoc = doc(db, "consult_requests", id);
  const snap = await getDoc(refDoc);

  if (!snap.exists()) {
    alert("상담 정보를 찾을 수 없습니다.");
    location.href = "/admin/admin-consult.html";
    return;
  }

  const data = snap.data();

  /* ------------------------------
      2. 기본 정보 표시
  ------------------------------ */
  document.getElementById("name").textContent = data.name;
  document.getElementById("phone").textContent = data.phone;
  document.getElementById("email").textContent = data.email;
  document.getElementById("type").textContent = data.applyType || "-";
  document.getElementById("message").textContent = data.content || "-";

  document.getElementById("createdAt").textContent =
    data.createdAt?.toDate
      ? data.createdAt.toDate().toLocaleString()
      : "-";

  /* ------------------------------
      3. 관리 항목 기본값
  ------------------------------ */
  document.getElementById("status").value = data.status || "신청";
  document.getElementById("manager").value = data.manager || "";
  document.getElementById("partner").value = data.partner || "";
  document.getElementById("contractCode").value = data.contractCode || "";

  /* ------------------------------
      4. 진행상황(progressLogs) 표시
  ------------------------------ */
  const progressList = document.getElementById("progressList");

  function renderProgress() {
    progressList.innerHTML = "";
    (data.progressLogs || []).forEach((log) => {
      const li = document.createElement("li");
      li.textContent = `${log.date} - ${log.status} : ${log.memo}`;
      progressList.appendChild(li);
    });
  }
  renderProgress();

  /* ------------------------------
      5. 진행상황 추가
  ------------------------------ */
  document.getElementById("addProgressBtn")?.addEventListener("click", async () => {
    const memo = document.getElementById("progressMemo").value.trim();
    if (!memo) return alert("메모를 입력하세요.");

    const newLog = {
      date: new Date().toLocaleString(),
      status: document.getElementById("status").value,
      memo
    };

    await updateDoc(refDoc, {
      progressLogs: arrayUnion(newLog)
    });

    data.progressLogs = [...(data.progressLogs || []), newLog];
    renderProgress();
    document.getElementById("progressMemo").value = "";
  });

  /* ------------------------------
      6. 계약서 업로드
  ------------------------------ */
  document.getElementById("uploadContractBtn")?.addEventListener("click", async () => {
    const file = document.getElementById("contractFile").files[0];
    if (!file) return alert("파일을 선택하세요.");

    const fileRef = ref(storage, `contracts/${id}/${file.name}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);

    await updateDoc(refDoc, {
      contract: {
        url,
        createdAt: serverTimestamp()
      }
    });

    alert("계약서 업로드 완료!");
    document.getElementById("contractInfo").innerHTML =
      `<a href="${url}" target="_blank">계약서 보기</a>`;
  });

  /* ------------------------------
      7. 입금/분납 저장
  ------------------------------ */
  document.getElementById("savePaymentsBtn")?.addEventListener("click", async () => {
    const totalAmount = Number(document.getElementById("totalAmount").value || 0);
    const paidAmount = Number(document.getElementById("paidAmount").value || 0);

    const rows = document.querySelectorAll(".payment-row");
    const schedules = [];

    rows.forEach((row) => {
      schedules.push({
        dueDate: row.querySelector(".dueDate").value,
        amount: Number(row.querySelector(".amount").value),
        paid: row.querySelector(".paid").checked
      });
    });

    await updateDoc(refDoc, {
      payments: {
        totalAmount,
        paidAmount,
        schedules
      }
    });

    alert("입금/분납 정보 저장 완료!");
  });

  /* ------------------------------
      8. 기본 관리 항목 저장
  ------------------------------ */
  document.getElementById("saveBtn").addEventListener("click", async () => {
    const updateData = {
      status: document.getElementById("status").value,
      manager: document.getElementById("manager").value,
      partner: document.getElementById("partner").value,
      contractCode: document.getElementById("contractCode").value
    };

    try {
      await updateDoc(refDoc, updateData);
      alert("저장되었습니다.");
    } catch (err) {
      console.error(err);
      alert("저장 중 오류가 발생했습니다.");
    }
  });

});
