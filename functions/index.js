// Cloud Functions v2용 index.js

// v2로 변환된 v1.js 함수들 가져오기
const {
  sendExpireAlerts,
  autoMatchDeposits,
  fetchBankDeposits,
  geoip,
  setAdminRole,
  setManagerRole,
  sendPushToUser
} = require("./v1");

// docAI2 함수 가져오기
const { docAI2 } = require("./docAI2");

// v2 방식으로 함수 export
exports.sendExpireAlerts = sendExpireAlerts;
exports.autoMatchDeposits = autoMatchDeposits;
exports.fetchBankDeposits = fetchBankDeposits;
exports.geoip = geoip;
exports.setAdminRole = setAdminRole;
exports.setManagerRole = setManagerRole;
exports.sendPushToUser = sendPushToUser;

exports.docAI2 = docAI2;
