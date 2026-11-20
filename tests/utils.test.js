const { calculateRefund } = require('../src/utils/refund');
const { validateAppointmentSlot } = require('../src/utils/validation');

describe('calculateRefund', () => {
  const cancellation = new Date('2026-08-01T09:00:00');

  test('returns 100% when notice is more than 48 hours', () => {
    expect(calculateRefund('2026-08-03 10:00:00', cancellation))
      .toMatchObject({ percentage: 100, noticeHours: 49 });
  });

  test('returns 100% just before the 48-hour boundary', () => {
    expect(calculateRefund('2026-08-03 09:00:01', cancellation).percentage).toBe(100);
  });

  test('returns 50% at exactly 48 hours', () => {
    expect(calculateRefund('2026-08-03 09:00:00', cancellation))
      .toMatchObject({ percentage: 50, noticeHours: 48 });
  });

  test('returns 50% at exactly 24 hours', () => {
    expect(calculateRefund('2026-08-02 09:00:00', cancellation))
      .toMatchObject({ percentage: 50, noticeHours: 24 });
  });

  test('returns 0% when notice is less than 24 hours', () => {
    expect(calculateRefund('2026-08-02 08:59:59', cancellation)
      .percentage).toBe(0);
  });
});

describe('validateAppointmentSlot', () => {
  const now = new Date('2026-08-01T08:00:00');

  test('accepts a valid 09:00 working-hours slot', () => {
    expect(validateAppointmentSlot('2026-08-01 09:00:00', now)).toBeNull();
  });

  test('rejects 17:00 because it is outside working hours', () => {
    expect(validateAppointmentSlot('2026-08-01 17:00:00', now))
      .toBe('appointment_datetime must be between 09:00 and 17:00 on a 30-minute boundary');
  });

  test('rejects a 09:15 slot that is not on a 30-minute boundary', () => {
    expect(validateAppointmentSlot('2026-08-01 09:15:00', now))
      .toBe('appointment_datetime must be between 09:00 and 17:00 on a 30-minute boundary');
  });

  test('rejects malformed date strings', () => {
    expect(validateAppointmentSlot('not-a-date', now))
      .toBe('appointment_datetime must use YYYY-MM-DD HH:MM:SS format');
  });

  test('rejects impossible calendar dates', () => {
    expect(validateAppointmentSlot('2026-02-30 09:00:00', now))
      .toBe('appointment_datetime must use YYYY-MM-DD HH:MM:SS format');
  });
});
