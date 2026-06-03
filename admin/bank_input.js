async function addBankDeposit() {
  const depositor = document.getElementById("depositor").value.trim();
  const amount = Number(document.getElementById("amount").value);

  await db.collection("bank_deposits").add({
    depositor_name: depositor,
    amount: amount,
    timestamp: Date.now(),
    matched: false
  });

  alert("입금 내역이 등록되었습니다.");
}
