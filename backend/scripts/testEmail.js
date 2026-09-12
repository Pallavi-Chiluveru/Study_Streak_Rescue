const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const email = require('../services/emailService');
(async () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('Email delivery testing is development-only.'); process.exitCode = 1; return;
  }
  if (!await email.initializeEmailService()) { process.exitCode = 1; return; }
  try {
    await email.sendTestEmail();
    console.log('Test email accepted by SMTP. Check the configured sender inbox.');
  } catch {
    console.error('Email service unavailable'); process.exitCode = 1;
  }
})();
