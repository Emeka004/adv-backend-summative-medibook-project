const patientModel = require('../models/patientModel');
const {
  isValidId,
  validatePatientInput
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
    res.json(await patientModel.findAll());
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    validateIdOrThrow(req.params.id);
    const patient = await patientModel.findById(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(patient);
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const validationError = validatePatientInput(req.body);
    if (validationError) throw badRequest(validationError);
    res.status(201).json(await patientModel.create(req.body));
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    validateIdOrThrow(req.params.id);
    if (!req.body || Object.keys(req.body).length === 0) {
      throw badRequest('At least one patient field is required');
    }
    const validationError = validatePatientInput(req.body, true);
    if (validationError) throw badRequest(validationError);
    if (!(await patientModel.findById(req.params.id))) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(await patientModel.update(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    validateIdOrThrow(req.params.id);
    if (!(await patientModel.remove(req.params.id))) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = { list, getById, create, update, remove };
