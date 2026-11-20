const appointmentModel = require('../models/appointmentModel');
const { calculateRefund } = require('../utils/refund');
const { appendAuditLog } = require('../utils/auditLogger');
const {
  isValidId,
  validateAppointmentSlot
} = require('../utils/validation');

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function validateIdOrThrow(id) {
  if (!isValidId(id)) throw badRequest('id must be a positive integer');
}

async function book(req, res, next) {
  try {
    const {
      patient_id: patientId,
      doctor_id: doctorId,
      appointment_datetime: appointmentDateTime
    } = req.body || {};

    if (!isValidId(patientId) || !isValidId(doctorId)) {
      throw badRequest('patient_id and doctor_id must be positive integers');
    }
    const slotError = validateAppointmentSlot(appointmentDateTime);
    if (slotError) {
      const error = new Error(slotError);
      error.status = 422;
      throw error;
    }

    if (!(await appointmentModel.findPatient(patientId))) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    if (!(await appointmentModel.findDoctor(doctorId))) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const appointment = await appointmentModel.createBooking(
      patientId,
      doctorId,
      appointmentDateTime
    );
    appendAuditLog({
      event: 'appointment_booked',
      appointment_id: appointment.id,
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      appointment_datetime: appointment.appointment_datetime,
      amount_paid: appointment.amount_paid
    });
    res.status(201).json(appointment);
  } catch (error) {
    next(error);
  }
}

async function cancel(req, res, next) {
  try {
    validateIdOrThrow(req.params.id);
    const appointment = await appointmentModel.getById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    if (appointment.status === 'cancelled') {
      const error = new Error('Appointment is already cancelled');
      error.status = 409;
      throw error;
    }

    const refund = calculateRefund(appointment.appointment_datetime);
    const refundAmount = Number(
      ((Number(appointment.amount_paid) * refund.percentage) / 100).toFixed(2)
    );
    const cancelled = await appointmentModel.cancelById(
      req.params.id,
      refundAmount,
      refund.percentage
    );
    if (!cancelled) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    appendAuditLog({
      event: 'appointment_cancelled',
      appointment_id: cancelled.id,
      patient_id: cancelled.patient_id,
      doctor_id: cancelled.doctor_id,
      appointment_datetime: cancelled.appointment_datetime,
      refund_amount: refundAmount,
      refund_percentage: refund.percentage,
      notice_hours: Number(refund.noticeHours.toFixed(2))
    });
    res.json({
      appointment: cancelled,
      refund: {
        amount: refundAmount,
        percentage: refund.percentage,
        notice_hours: Number(refund.noticeHours.toFixed(2))
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { book, cancel };
