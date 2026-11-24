const { Queue } = require('bullmq');
const redis = require('../config/redis');

const connection = redis;
const promotionQueue = new Queue('medibook-promotions', { connection });
const notificationQueue = new Queue('medibook-notifications', { connection });

function slotWaitlistKey(doctorId, appointmentDateTime) {
  return `medibook:waitlist:slot:${doctorId}:${appointmentDateTime}`;
}

function dayWaitlistKey(doctorId, date) {
  return `medibook:waitlist:day:${doctorId}:${date}`;
}

function expiredWaitlistKey() {
  return 'medibook:waitlist:expired';
}

async function addSlotWaitlist(patientId, doctorId, appointmentDateTime) {
  await redis.rpush(slotWaitlistKey(doctorId, appointmentDateTime), JSON.stringify({
    patient_id: patientId,
    doctor_id: doctorId,
    appointment_datetime: appointmentDateTime
  }));
}

async function addDayWaitlist(patientId, doctorId, date) {
  await redis.rpush(dayWaitlistKey(doctorId, date), JSON.stringify({
    patient_id: patientId,
    doctor_id: doctorId,
    date
  }));
}

async function popWaitlist(key) {
  const entry = await redis.lpop(key);
  return entry ? JSON.parse(entry) : null;
}

async function restoreWaitlistPriority(key, entry) {
  await redis.lpush(key, JSON.stringify(entry));
}

async function archiveWaitlistEntry(entry, reason) {
  await redis.rpush(expiredWaitlistKey(), JSON.stringify({
    ...entry,
    expired_at: new Date().toISOString(),
    reason
  }));
}

async function enqueuePromotion(job) {
  await promotionQueue.add('promote-waitlist', job, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: true,
    removeOnFail: false
  });
}

async function enqueueConfirmation(appointment) {
  await notificationQueue.add('confirmation-notification', {
    appointment_id: appointment.id,
    patient_id: appointment.patient_id,
    doctor_id: appointment.doctor_id,
    appointment_datetime: appointment.appointment_datetime,
    patient_email: appointment.patient_email,
    patient_name: appointment.patient_name
  }, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: true,
    removeOnFail: false
  });
}

module.exports = {
  slotWaitlistKey,
  dayWaitlistKey,
  expiredWaitlistKey,
  addSlotWaitlist,
  addDayWaitlist,
  popWaitlist,
  restoreWaitlistPriority,
  archiveWaitlistEntry,
  enqueuePromotion,
  enqueueConfirmation,
  promotionQueue,
  notificationQueue
};
