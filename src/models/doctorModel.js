const db = require('../config/database');

async function findAll() {
  const [rows] = await db.execute(
    `SELECT id, name, specialty, consultation_fee, room, created_at, updated_at
     FROM doctors
     ORDER BY id`
  );
  return rows;
}

async function findById(id) {
  const [rows] = await db.execute(
    `SELECT id, name, specialty, consultation_fee, room, created_at, updated_at
     FROM doctors
     WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function create({ name, specialty, consultation_fee, room }) {
  const [result] = await db.execute(
    `INSERT INTO doctors (name, specialty, consultation_fee, room)
     VALUES (?, ?, ?, ?)`,
    [name.trim(), specialty.trim(), Number(consultation_fee), room.trim()]
  );
  return findById(result.insertId);
}

async function update(id, { name, specialty, consultation_fee, room }) {
  await db.execute(
    `UPDATE doctors
     SET name = COALESCE(?, name),
         specialty = COALESCE(?, specialty),
         consultation_fee = COALESCE(?, consultation_fee),
         room = COALESCE(?, room)
     WHERE id = ?`,
    [
      name?.trim() || null,
      specialty?.trim() || null,
      consultation_fee === undefined ? null : Number(consultation_fee),
      room?.trim() || null,
      id
    ]
  );
  return findById(id);
}

async function remove(id) {
  const [result] = await db.execute('DELETE FROM doctors WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function getStatistics(id) {
  const [summaryRows] = await db.execute(
    `SELECT
       d.id,
       d.name,
       COALESCE(SUM(CASE WHEN a.status = 'booked' THEN a.amount_paid ELSE 0 END), 0) AS revenue_collected,
       COUNT(CASE WHEN a.status = 'booked' AND a.appointment_datetime > NOW() THEN 1 END) AS upcoming_appointment_count,
       ROUND(
         COUNT(CASE WHEN a.status = 'booked' AND DATE(a.appointment_datetime) = CURDATE() THEN 1 END)
         * 100.0 / 12,
         2
       ) AS utilization_percentage
     FROM doctors d
     LEFT JOIN appointments a ON a.doctor_id = d.id
     WHERE d.id = ?
     GROUP BY d.id, d.name`,
    [id]
  );
  if (!summaryRows[0]) return null;

  const [dailyRows] = await db.execute(
    `SELECT DATE(a.appointment_datetime) AS appointment_date,
            COUNT(*) AS appointment_count
     FROM appointments a
     WHERE a.doctor_id = ?
       AND a.status = 'booked'
       AND a.appointment_datetime >= CURDATE()
       AND a.appointment_datetime < DATE_ADD(CURDATE(), INTERVAL 7 DAY)
     GROUP BY DATE(a.appointment_datetime)
     ORDER BY appointment_date`,
    [id]
  );

  return { ...summaryRows[0], appointments_per_day: dailyRows };
}

async function doctorsReport() {
  const [rows] = await db.execute(
    `SELECT d.id,
            d.name,
            d.specialty,
            COUNT(a.id) AS total_appointments,
            COALESCE(SUM(a.amount_paid), 0) AS revenue_collected
     FROM doctors d
     LEFT JOIN appointments a
       ON a.doctor_id = d.id
      AND a.status = 'booked'
     GROUP BY d.id, d.name, d.specialty
     ORDER BY d.id`
  );
  return rows;
}

async function busyDaysReport() {
  const [rows] = await db.execute(
    `SELECT d.id AS doctor_id,
            d.name AS doctor_name,
            DATE(a.appointment_datetime) AS appointment_date,
            COUNT(*) AS booked_appointments,
            ROUND(COUNT(*) * 100.0 / 12, 2) AS utilization_percentage
     FROM doctors d
     JOIN appointments a ON a.doctor_id = d.id
     WHERE a.status = 'booked'
     GROUP BY d.id, d.name, DATE(a.appointment_datetime)
     HAVING COUNT(*) > (12 * 0.80)
     ORDER BY appointment_date, doctor_name`
  );
  return rows;
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
  getStatistics,
  doctorsReport,
  busyDaysReport
};
