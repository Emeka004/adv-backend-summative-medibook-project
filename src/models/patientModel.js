const db = require('../config/database');

async function findAll() {
  const [rows] = await db.execute(
    `SELECT id, name, email, phone, created_at, updated_at
     FROM patients
     ORDER BY id`
  );
  return rows;
}

async function findById(id) {
  const [rows] = await db.execute(
    `SELECT id, name, email, phone, created_at, updated_at
     FROM patients
     WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function create({ name, email, phone }) {
  const [result] = await db.execute(
    `INSERT INTO patients (name, email, phone)
     VALUES (?, ?, ?)`,
    [name.trim(), email.trim(), phone.trim()]
  );
  return findById(result.insertId);
}

async function update(id, { name, email, phone }) {
  await db.execute(
    `UPDATE patients
     SET name = COALESCE(?, name),
         email = COALESCE(?, email),
         phone = COALESCE(?, phone)
     WHERE id = ?`,
    [name?.trim() || null, email?.trim() || null, phone?.trim() || null, id]
  );
  return findById(id);
}

async function remove(id) {
  const [result] = await db.execute('DELETE FROM patients WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, create, update, remove };
