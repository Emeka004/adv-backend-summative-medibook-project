const {
  WORK_START_HOUR,
  WORK_END_HOUR,
  SLOT_MINUTES
} = require('../config/constants');

function isValidId(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}

function parseFutureDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? null : date;
}

function validateAppointmentSlot(value, now = new Date()) {
  const date = parseFutureDate(value);
  if (!date) return 'appointment_datetime must use YYYY-MM-DD HH:MM:SS format';
  if (date <= now) return 'appointment_datetime must be in the future';
  if (
    date.getHours() < WORK_START_HOUR ||
    date.getHours() >= WORK_END_HOUR ||
    date.getMinutes() % SLOT_MINUTES !== 0 ||
    date.getSeconds() !== 0
  ) {
    return 'appointment_datetime must be between 09:00 and 17:00 on a 30-minute boundary';
  }
  return null;
}

function validatePatientInput(body, partial = false) {
  const required = ['name', 'email', 'phone'];
  if (!partial && required.some((field) => !body[field])) {
    return 'name, email, and phone are required';
  }
  if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim().length < 2)) {
    return 'name must contain at least 2 characters';
  }
  if (
    body.email !== undefined &&
    (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))
  ) {
    return 'email must be a valid email address';
  }
  if (body.phone !== undefined && (typeof body.phone !== 'string' || body.phone.trim().length < 7)) {
    return 'phone must contain at least 7 characters';
  }
  return null;
}

function validateDoctorInput(body, partial = false) {
  const required = ['name', 'specialty', 'consultation_fee', 'room'];
  if (!partial && required.some((field) => body[field] === undefined || body[field] === '')) {
    return 'name, specialty, consultation_fee, and room are required';
  }
  if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim().length < 2)) {
    return 'name must contain at least 2 characters';
  }
  if (
    body.specialty !== undefined &&
    (typeof body.specialty !== 'string' || body.specialty.trim().length < 2)
  ) {
    return 'specialty must contain at least 2 characters';
  }
  if (
    body.consultation_fee !== undefined &&
    (!Number.isFinite(Number(body.consultation_fee)) || Number(body.consultation_fee) < 0)
  ) {
    return 'consultation_fee must be a non-negative number';
  }
  if (body.room !== undefined && (typeof body.room !== 'string' || !body.room.trim())) {
    return 'room is required';
  }
  return null;
}

module.exports = {
  isValidId,
  parseFutureDate,
  validateAppointmentSlot,
  validatePatientInput,
  validateDoctorInput
};
