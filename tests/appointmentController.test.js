jest.mock('../src/models/appointmentModel', () => ({
  findPatient: jest.fn(),
  findDoctor: jest.fn(),
  createBooking: jest.fn()
}));

jest.mock('../src/services/queueService', () => ({
  addSlotWaitlist: jest.fn(),
  addDayWaitlist: jest.fn(),
  enqueueConfirmation: jest.fn()
}));

jest.mock('../src/utils/auditLogger', () => ({
  appendAuditLog: jest.fn()
}));

const appointmentModel = require('../src/models/appointmentModel');
const queues = require('../src/services/queueService');
const { book } = require('../src/controllers/appointmentController');

function getFutureSlot() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);

  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} 10:00:00`;
}

function makeResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
}

describe('appointment booking waitlist responses', () => {
  const patientId = 3;
  const doctorId = 1;
  const appointmentDateTime = getFutureSlot();

  beforeEach(() => {
    jest.clearAllMocks();
    appointmentModel.findPatient.mockResolvedValue({ id: patientId });
    appointmentModel.findDoctor.mockResolvedValue({ id: doctorId });
    queues.addSlotWaitlist.mockResolvedValue(undefined);
    queues.addDayWaitlist.mockResolvedValue(undefined);
  });

  test('adds a slot-conflict booking to the slot waitlist', async () => {
    const error = new Error('Doctor slot is taken');
    error.code = 'DOCTOR_SLOT_TAKEN';
    appointmentModel.createBooking.mockRejectedValue(error);
    const req = {
      body: {
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_datetime: appointmentDateTime
      }
    };
    const res = makeResponse();
    const next = jest.fn();

    await book(req, res, next);

    expect(queues.addSlotWaitlist)
      .toHaveBeenCalledWith(patientId, doctorId, appointmentDateTime);
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      waitlist: expect.objectContaining({ appointment_datetime: appointmentDateTime })
    }));
    expect(next).not.toHaveBeenCalled();
  });

  test('adds a day-cap conflict to the doctor-day waitlist', async () => {
    const error = new Error('Doctor has reached the daily cap');
    error.code = 'DOCTOR_DAY_FULL';
    appointmentModel.createBooking.mockRejectedValue(error);
    const req = {
      body: {
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_datetime: appointmentDateTime
      }
    };
    const res = makeResponse();
    const next = jest.fn();

    await book(req, res, next);

    expect(queues.addDayWaitlist)
      .toHaveBeenCalledWith(patientId, doctorId, appointmentDateTime.slice(0, 10));
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      waitlist: expect.objectContaining({
        date: appointmentDateTime.slice(0, 10),
        appointment_datetime: null
      })
    }));
    expect(next).not.toHaveBeenCalled();
  });
});
