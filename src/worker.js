const { Worker } = require('bullmq');
const redis = require('./config/redis');
const appointmentModel = require('./models/appointmentModel');
const queues = require('./services/queueService');
const { appendAuditLog } = require('./utils/auditLogger');
const {
  getDayWaitlistExpiryReason,
  getSlotWaitlistExpiryReason
} = require('./utils/waitlist');

async function archiveWaitlistEntry(key, entry, reason) {
  try {
    await queues.archiveWaitlistEntry(entry, reason);
  } catch (error) {
    await queues.restoreWaitlistPriority(key, entry);
    throw error;
  }
  await appendAuditLog({
    event: 'waitlist_expired',
    patient_id: entry.patient_id,
    doctor_id: entry.doctor_id,
    appointment_datetime: entry.appointment_datetime || null,
    date: entry.date || null,
    reason
  });
}

async function promoteSlot(job) {
  if (job.data.type === 'slot') {
    const key = queues.slotWaitlistKey(
      job.data.doctor_id,
      job.data.appointment_datetime
    );
    const entry = await queues.popWaitlist(key);
    if (!entry) return;

    const expiryReason = getSlotWaitlistExpiryReason(
      entry.appointment_datetime
    );
    if (expiryReason) {
      await archiveWaitlistEntry(key, entry, expiryReason);
      return;
    }

    let appointment;
    try {
      appointment = await appointmentModel.createBooking(
        entry.patient_id,
        entry.doctor_id,
        entry.appointment_datetime
      );
    } catch (error) {
      await queues.restoreWaitlistPriority(key, entry);
      throw error;
    }
    try {
      await queues.enqueueConfirmation(appointment);
    } catch (error) {
      console.error('Failed to enqueue promoted appointment confirmation:', error.message);
    }
    await appendAuditLog({
      event: 'waitlist_promoted',
      appointment_id: appointment.id,
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      appointment_datetime: appointment.appointment_datetime
    });
    return;
  }

  if (job.data.type === 'day') {
    const key = queues.dayWaitlistKey(job.data.doctor_id, job.data.date);
    const entry = await queues.popWaitlist(key);
    if (!entry) return;

    const expiryReason = getDayWaitlistExpiryReason(entry.date);
    if (expiryReason) {
      await archiveWaitlistEntry(key, entry, expiryReason);
      return;
    }

    let slot;
    try {
      slot = await appointmentModel.findAvailableSlot(
        entry.doctor_id,
        entry.date
      );
    } catch (error) {
      await queues.restoreWaitlistPriority(key, entry);
      throw error;
    }
    if (!slot) {
      await queues.restoreWaitlistPriority(key, entry);
      return;
    }

    let appointment;
    try {
      appointment = await appointmentModel.createBooking(
        entry.patient_id,
        entry.doctor_id,
        slot
      );
    } catch (error) {
      await queues.restoreWaitlistPriority(key, entry);
      throw error;
    }
    try {
      await queues.enqueueConfirmation(appointment);
    } catch (error) {
      console.error('Failed to enqueue promoted appointment confirmation:', error.message);
    }
    await appendAuditLog({
      event: 'waitlist_promoted',
      appointment_id: appointment.id,
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      appointment_datetime: appointment.appointment_datetime
    });
  }
}

const promotionWorker = new Worker(
  'medibook-promotions',
  promoteSlot,
  { connection: redis }
);

const notificationWorker = new Worker(
  'medibook-notifications',
  async (job) => {
    await appendAuditLog({
      event: 'appointment_confirmation',
      job_id: String(job.id),
      ...job.data
    });
  },
  { connection: redis }
);

promotionWorker.on('failed', (job, error) => {
  console.error(`Waitlist promotion failed (${job?.id}):`, error.message);
});

notificationWorker.on('failed', (job, error) => {
  console.error(`Notification job failed (${job?.id}):`, error.message);
});

console.log('MediBook workers listening for promotions and notifications');
