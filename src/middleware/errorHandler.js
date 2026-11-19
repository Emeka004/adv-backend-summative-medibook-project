function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const statusByCode = {
    ER_DUP_ENTRY: 409,
    DOCTOR_SLOT_TAKEN: 409,
    APPOINTMENT_ALREADY_CANCELLED: 409,
    DOCTOR_DAY_FULL: 422,
    BOOKING_LOCK_TIMEOUT: 409,
    ER_NO_REFERENCED_ROW_2: 400,
    ER_ROW_IS_REFERENCED_2: 409
  };
  const status = error.status || statusByCode[error.code] || 500;
  let message = error.message;

  if (error.code === 'ER_DUP_ENTRY') {
    message = 'A record with one of those unique values already exists';
  } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    message = 'The referenced patient or doctor does not exist';
  } else if (status === 500) {
    message = 'Internal server error';
    console.error(error);
  }

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
