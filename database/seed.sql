USE medibook;

INSERT INTO patients (name, email, phone)
VALUES
  ('Ama Mensah', 'ama@mail.com', '0244-111-222'),
  ('Kojo Owusu', 'kojo@mail.com', '0555-333-444'),
  ('Efua Asare', 'efua@mail.com', '0200-555-666');

INSERT INTO doctors (name, specialty, consultation_fee, room)
VALUES
  ('Dr. Boateng', 'Dermatology', 150.00, 'R-12'),
  ('Dr. Adjei', 'Paediatrics', 100.00, 'R-03'),
  ('Dr. Mensah', 'Cardiology', 200.00, 'R-08');

SET @boateng_id = (
  SELECT id FROM doctors WHERE name = 'Dr. Boateng'
);
SET @adjei_id = (
  SELECT id FROM doctors WHERE name = 'Dr. Adjei'
);
SET @ama_id = (
  SELECT id FROM patients WHERE email = 'ama@mail.com'
);
SET @kojo_id = (
  SELECT id FROM patients WHERE email = 'kojo@mail.com'
);
SET @efua_id = (
  SELECT id FROM patients WHERE email = 'efua@mail.com'
);

INSERT INTO appointments (
  patient_id,
  doctor_id,
  appointment_datetime,
  amount_paid,
  status
)
VALUES
  (@ama_id,  @boateng_id, '2026-12-01 09:00:00', 150.00, 'booked'),
  (@kojo_id, @boateng_id, '2026-12-01 09:30:00', 150.00, 'booked'),
  (@efua_id, @boateng_id, '2026-12-01 10:00:00', 150.00, 'booked'),
  (@ama_id,  @boateng_id, '2026-12-01 10:30:00', 150.00, 'booked'),
  (@kojo_id, @boateng_id, '2026-12-01 11:00:00', 150.00, 'booked'),
  (@efua_id, @boateng_id, '2026-12-01 11:30:00', 150.00, 'booked'),
  (@ama_id,  @boateng_id, '2026-12-01 12:00:00', 150.00, 'booked'),
  (@efua_id, @boateng_id, '2026-12-01 12:30:00', 150.00, 'booked'),
  (@ama_id,  @boateng_id, '2026-12-01 13:00:00', 150.00, 'booked'),
  (@kojo_id, @boateng_id, '2026-12-01 13:30:00', 150.00, 'booked'),
  (@kojo_id, @adjei_id,   '2026-12-02 10:00:00', 100.00, 'booked');
