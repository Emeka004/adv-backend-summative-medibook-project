const db = require('../config/database');

async function findPatient(id) {
  const [rows] = await db.execute('SELECT id FROM patients WHERE id = ?', [id]);
  return rows[0] || null;
}

async function findDoctor(id) {
  const [rows] = await db.execute(
    'SELECT id, consultation_fee FROM doctors WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

async function getById(id) {
  const [rows] = await db.execute(
    `SELECT a.id,
            a.patient_id,
            a.doctor_id,
            a.appointment_datetime,
            a.amount_paid,
            a.status,
            a.booked_at,
            a.cancelled_at,
            a.refund_amount,
            a.refund_percentage,
            p.name AS patient_name,
            p.email AS patient_email,
            d.name AS doctor_name,
            d.specialty
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     JOIN doctors d ON d.id = a.doctor_id
     WHERE a.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function createBooking(patientId, doctorId, appointmentDateTime) {
  const connection = await db.getConnection();
  const lockName = `medibook:${doctorId}:${appointmentDateTime.slice(0, 10)}`;
  let lockAcquired = false;

  try {
    await connection.beginTransaction();
    const [lockRows] = await connection.execute(
      'SELECT GET_LOCK(?, 10) AS acquired',
      [lockName]
    );
    lockAcquired = lockRows[0].acquired === 1;
    if (!lockAcquired) {
      const error = new Error('Could not reserve the doctor day for booking');
      error.code = 'BOOKING_LOCK_TIMEOUT';
      throw error;
    }

    const [dayRows] = await connection.execute(
      `SELECT COUNT(*) AS booked_count
       FROM appointments
       WHERE doctor_id = ?
         AND status = 'booked'
         AND DATE(appointment_datetime) = DATE(?)`,
      [doctorId, appointmentDateTime]
    );
    if (Number(dayRows[0].booked_count) >= 12) {
      const error = new Error('Doctor has reached the 12-appointment daily cap');
      error.code = 'DOCTOR_DAY_FULL';
      throw error;
    }

    const [slotRows] = await connection.execute(
      `SELECT id
       FROM appointments
       WHERE doctor_id = ?
         AND appointment_datetime = ?
         AND status = 'booked'`,
      [doctorId, appointmentDateTime]
    );
    if (slotRows.length > 0) {
      const error = new Error('Doctor already has an appointment at that date and time');
      error.code = 'DOCTOR_SLOT_TAKEN';
      throw error;
    }

    const [doctorRows] = await connection.execute(
      'SELECT consultation_fee FROM doctors WHERE id = ?',
      [doctorId]
    );
    if (!doctorRows[0]) {
      const error = new Error('Doctor not found');
      error.code = 'DOCTOR_NOT_FOUND';
      throw error;
    }

    const [result] = await connection.execute(
      `INSERT INTO appointments
         (patient_id, doctor_id, appointment_datetime, amount_paid, status)
       VALUES (?, ?, ?, ?, 'booked')`,
      [patientId, doctorId, appointmentDateTime, doctorRows[0].consultation_fee]
    );

    await connection.commit();
    return getById(result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    if (lockAcquired) {
      await connection.execute('SELECT RELEASE_LOCK(?)', [lockName]).catch(() => {});
    }
    connection.release();
  }
}

async function cancelById(id, refundAmount, refundPercentage) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT id, status
       FROM appointments
       WHERE id = ?
       FOR UPDATE`,
      [id]
    );
    if (!rows[0]) {
      await connection.rollback();
      return null;
    }
    if (rows[0].status === 'cancelled') {
      const error = new Error('Appointment is already cancelled');
      error.code = 'APPOINTMENT_ALREADY_CANCELLED';
      throw error;
    }

    await connection.execute(
      `UPDATE appointments
       SET status = 'cancelled',
           cancelled_at = NOW(),
           refund_amount = ?,
           refund_percentage = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [refundAmount, refundPercentage, id]
    );
    await connection.commit();
    return getById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function findAvailableSlot(doctorId, date) {
  const [rows] = await db.execute(
    `SELECT slot_time
     FROM (
       SELECT '09:00:00' AS slot_time UNION ALL SELECT '09:30:00'
       UNION ALL SELECT '10:00:00' UNION ALL SELECT '10:30:00'
       UNION ALL SELECT '11:00:00' UNION ALL SELECT '11:30:00'
       UNION ALL SELECT '12:00:00' UNION ALL SELECT '12:30:00'
       UNION ALL SELECT '13:00:00' UNION ALL SELECT '13:30:00'
       UNION ALL SELECT '14:00:00' UNION ALL SELECT '14:30:00'
       UNION ALL SELECT '15:00:00' UNION ALL SELECT '15:30:00'
       UNION ALL SELECT '16:00:00' UNION ALL SELECT '16:30:00'
     ) slots
     WHERE NOT EXISTS (
       SELECT 1
       FROM appointments
       WHERE doctor_id = ?
         AND status = 'booked'
         AND appointment_datetime = TIMESTAMP(?, slot_time)
     )
       AND TIMESTAMP(?, slot_time) > NOW()
     ORDER BY slot_time
     LIMIT 1`,
    [doctorId, date, date]
  );
  return rows[0] ? `${date} ${rows[0].slot_time}` : null;
}

module.exports = {
  findPatient,
  findDoctor,
  getById,
  createBooking,
  cancelById,
  findAvailableSlot
};
