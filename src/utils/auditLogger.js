const fs = require('fs');
const path = require('path');

const logDirectory = path.resolve(__dirname, '..', '..', 'logs');
const auditLogPath = path.join(logDirectory, 'audit.log');

async function appendAuditLog(entry) {
  try {
    await fs.promises.mkdir(logDirectory, { recursive: true });
    await fs.promises.appendFile(
      auditLogPath,
      `${JSON.stringify({ timestamp: new Date().toISOString(), ...entry })}\n`,
      'utf8'
    );
  } catch (error) {
    console.error('Failed to write audit log:', error.message);
  }
}

module.exports = { appendAuditLog };
