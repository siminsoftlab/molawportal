import { db } from "./firebase-init.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/* ============================================================
   Firestore 초기 컬렉션 생성 (스키마 기반 더미 문서)
============================================================ */

async function initFirestoreSchema() {
  // 1) creditor_companies
  await setDoc(doc(db, "creditor_companies", "init"), {
    name: "",
    phone: "",
    visit_issue: false,
    online_issue: false,
    mail_issue: false,
    fax_receive: false,
    required_documents: [],
    application_form_url: "",
    delegation_form_url: "",
    privacy_form_url: "",
    special_debt_form_url: "",
    blog_tutorial_url: "",
    youtube_tutorial_url: "",
    reviews_url: "",
    is_active: true,
    _init: true
  });

  // 2) debt_certificate_requests
  await setDoc(doc(db, "debt_certificate_requests", "init"), {
    user_id: "",
    creditor_id: "",
    request_date: "",
    status: "신청",
    base_fee: 0,
    actual_cost: 0,
    service_fee: 0,
    total_cost: 0,
    deposit_deadline: "",
    deposit_bank: "",
    deposit_account: "",
    deposit_name: "",
    deposit_confirmed: false,
    invoice_url: "",
    required_documents_uploaded: [],
    _init: true
  });

  // 3) delivery_registry
  await setDoc(doc(db, "delivery_registry", "init"), {
    request_id: "",
    receiver_name: "",
    receiver_address: "",
    tracking_number: "",
    sent_date: "",
    delivered_date: "",
    status: "",
    _init: true
  });

  // 4) partners
  await setDoc(doc(db, "partners", "init"), {
    name: "",
    phone: "",
    region: "",
    education_completed: false,
    cost_per_case: 0,
    insurance_status: false,
    active: true,
    _init: true
  });

  // 5) partner_tasks
  await setDoc(doc(db, "partner_tasks", "init"), {
    request_id: "",
    partner_id: "",
    assigned_date: "",
    completed_date: "",
    status: "",
    _init: true
  });

  // 6) pdf_fields
  await setDoc(doc(db, "pdf_fields", "init"), {
    creditor_id: "",
    pdf_name: "",
    field_name: "",
    field_type: "",
    field_value: "",
    required: false,
    _init: true
  });

  console.log("🔥 Firestore 기본 스키마 초기화 완료!");
}

initFirestoreSchema();
