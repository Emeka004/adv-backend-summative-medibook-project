const { Worker } = require('bullmq');
const redis = require('./config/redis');
const appointmentModel = require('./models/appointmentModel');
const queues = require('./services/queueService');
const { appendAuditLog } = require('./utils/auditLogger');

async function promoteSlot(job) {
  if (job.data.type === 'slot') {
    const key = queues.slotWaitlistKey(
      job.data.doctor_id,
      job.data.appointment_datetime
    );
    const entry = await queues.popWaitlist(key);
    if (!entry) return;

    try {
      const appointment = await appointmentModel.createBooking(
        entry.patient_id,
        entry.doctor_id,
        entry.appointment_datetime
      );
      await queues.enqueueConfirmation(appointment);
      await appendAuditLog({
        event: 'waitlist_promoted',
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        doctor_id: appointment.doctor_id,
        appointment_datetime: appointment.appointment_datetime
      });
    } catch (error) {
      await queues.restoreWaitlistPriority(key, entry);
      throw error;
    }
    return;
  }

  if (job.data.type === 'day') {
    const key = queues.dayWaitlistKey(job.data.doctor_id, job.data.date);
    const entry = await queues.popWaitlist(key);
    if (!entry) return;

    try {
      const slot = await appointmentModel.findAvailableSlot(
        entry.doctor_id,
        entry.date
      );
      if (!slot) {
        await queues.restoreWaitlistPriority(key, entry);
        throw new Error('No available slot remains for the waitlisted day');
      }
      const appointment = await appointmentModel.createBooking(
        entry.patient_id,
        entry.doctor_id,
        slot
      );
      await queues.enqueueConfirmation(appointment);
      await appendAuditLog({
        event: 'waitlist_promoted',
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        doctor_id: appointment.doctor_id,
        appointment_datetime: appointment.appointment_datetime
      });
    } catch (error) {
      await queues.restoreWaitlistPriority(key, entry);
      throw error;
    }
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
