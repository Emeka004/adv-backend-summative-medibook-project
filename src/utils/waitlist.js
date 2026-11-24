const { WORK_END_HOUR } = require('../config/constants');
const { parseFutureDate, validateAppointmentSlot } = require('./validation');

function getSlotWaitlistExpiryReason(appointmentDateTime, now = new Date()) {
  return validateAppointmentSlot(appointmentDateTime, now);
}

function getDayWaitlistExpiryReason(date, now = new Date()) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return 'date must use YYYY-MM-DD format';
  }

  const endOfWorkingDay = parseFutureDate(
    `${date} ${String(WORK_END_HOUR).padStart(2, '0')}:00:00`
  );
  if (!endOfWorkingDay) return 'date must use a valid calendar date';
  if (endOfWorkingDay <= now) return 'No future appointment slots remain for the waitlisted day';
  return null;
}

module.exports = {
  getSlotWaitlistExpiryReason,
  getDayWaitlistExpiryReason
};
