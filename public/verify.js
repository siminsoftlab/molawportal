// URL 파라미터에서 token 가져오기
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get("token");

if (!token) {
  alert("잘못된 접근입니다.");
  window.location.href = "/"; 
}

// 서버에 결제 여부 확인 요청
fetch(`/api/check-payment?token=${token}`)
  .then(res => res.json())
  .then(data => {
    if (!data.success) {
      alert("결제가 확인되지 않았습니다.");
      window.location.href = "/payment.html";
      return;
    }

    // 만료 여부 확인
    const now = new Date();
    const expire = new Date(data.expireDate);

    if (now > expire) {
      alert("결제 이용 기간이 만료되었습니다.");
      window.location.href = "/payment.html";
      return;
    }

    // 인증 성공 → repay.html로 이동
    window.location.href = `/calculators/repay.html?token=${token}`;
  })
  .catch(() => {
    alert("서버 오류가 발생했습니다.");
    window.location.href = "/";
  });
