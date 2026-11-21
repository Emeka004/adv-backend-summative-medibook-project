CREATE DATABASE IF NOT EXISTS medibook
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE medibook;

CREATE TABLE IF NOT EXISTS patients (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_patients_email (email),
  UNIQUE KEY uq_patients_phone (phone)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS doctors (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  specialty VARCHAR(100) NOT NULL,
  consultation_fee DECIMAL(10, 2) NOT NULL,
  room VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_doctors_fee CHECK (consultation_fee >= 0)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS appointments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  patient_id BIGINT UNSIGNED NOT NULL,
  doctor_id BIGINT UNSIGNED NOT NULL,
  appointment_datetime DATETIME NOT NULL,
  amount_paid DECIMAL(10, 2) NOT NULL,
  status ENUM('booked', 'cancelled') NOT NULL DEFAULT 'booked',
  booked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_at DATETIME NULL,
  refund_amount DECIMAL(10, 2) NULL,
  refund_percentage TINYINT UNSIGNED NULL,
  active_slot_key CHAR(1)
    GENERATED ALWAYS AS (
      CASE WHEN status = 'booked' THEN 'Y' ELSE NULL END
    ) STORED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_active_doctor_slot (
    doctor_id,
    appointment_datetime,
    active_slot_key
  ),
  CONSTRAINT fk_appointments_patient
    FOREIGN KEY (patient_id) REFERENCES patients (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_appointments_doctor
    FOREIGN KEY (doctor_id) REFERENCES doctors (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_appointments_amount_paid CHECK (amount_paid >= 0),
  CONSTRAINT chk_appointments_refund_amount
    CHECK (refund_amount IS NULL OR refund_amount >= 0),
  CONSTRAINT chk_appointments_refund_percentage
    CHECK (refund_percentage IS NULL OR refund_percentage IN (0, 50, 100)),
    CONSTRAINT chk_appointments_slot CHECK (
    SECOND(appointment_datetime) = 0
    AND MINUTE(appointment_datetime) IN (0, 30)
    AND TIME(appointment_datetime)
        BETWEEN '09:00:00' AND '16:30:00'
)
) ENGINE = InnoDB;
