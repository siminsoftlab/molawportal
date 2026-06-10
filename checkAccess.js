/* ===============================
1) 공통 모듈 구조
=================================*/
export async function checkAccess(onSuccess) {
    const auth = await checkLoginStatus();
    if (!auth.isLoggedIn) {
        openModal('login');
        return;
    }
    const license = await checkLicenseStatus();
    if (!license.isActive) {
        if (license.isExpired) {
            openModal('expired');
        } else {
            openModal('purchase');
        }
        return;
    }

    // 모든 조건 충족 → 계산 실행
    onSuccess();
}
/* ===============================
2) 공통 API 호출 함수
=================================*/
async function checkLoginStatus() {
    const res = await fetch('/api/auth/status');
    return await res.json();
}

async function checkLicenseStatus() {
    const res = await fetch('/api/license/status');
    return await res.json();
}
/* ===============================
3) 공통 모달 호출 함수
=================================*/
function openModal(type) {
    switch(type) {
        case 'login':
            showLoginModal();
            break;
        case 'purchase':
            showPurchaseModal();
            break;
        case 'expired':
            showExpiredModal();
            break;
    }
}
