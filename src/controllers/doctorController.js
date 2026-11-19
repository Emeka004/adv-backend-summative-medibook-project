const doctorModel = require('../models/doctorModel');
const {
  isValidId,
  validateDoctorInput
} = require('../utils/validation');

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function validateIdOrThrow(id) {
  if (!isValidId(id)) throw badRequest('id must be a positive integer');
}

async function list(req, res, next) {
  try {
    res.json(await doctorModel.findAll());
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    validateIdOrThrow(req.params.id);
    const doctor = await doctorModel.findById(req.params.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    res.json(doctor);
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const validationError = validateDoctorInput(req.body);
    if (validationError) throw badRequest(validationError);
    res.status(201).json(await doctorModel.create(req.body));
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    validateIdOrThrow(req.params.id);
    if (!req.body || Object.keys(req.body).length === 0) {
      throw badRequest('At least one doctor field is required');
    }
    const validationError = validateDoctorInput(req.body, true);
    if (validationError) throw badRequest(validationError);
    if (!(await doctorModel.findById(req.params.id))) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    res.json(await doctorModel.update(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    validateIdOrThrow(req.params.id);
    if (!(await doctorModel.remove(req.params.id))) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function statistics(req, res, next) {
  try {
    validateIdOrThrow(req.params.id);
    const result = await doctorModel.getStatistics(req.params.id);
    if (!result) return res.status(404).json({ error: 'Doctor not found' });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function report(req, res, next) {
  try {
    res.json(await doctorModel.doctorsReport());
  } catch (error) {
    next(error);
  }
}

async function busyDays(req, res, next) {
  try {
    res.json(await doctorModel.busyDaysReport());
  } catch (error) {
    next(error);
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  statistics,
  report,
  busyDays
};
