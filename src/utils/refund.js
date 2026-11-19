function calculateRefund(appointmentDateTime, cancellationDateTime = new Date()) {
  const appointment = new Date(String(appointmentDateTime).replace(' ', 'T'));
  const cancellation = new Date(cancellationDateTime);
  const noticeHours = (appointment.getTime() - cancellation.getTime()) / 3600000;

  if (noticeHours > 48) return { percentage: 100, noticeHours };
  if (noticeHours >= 24) return { percentage: 50, noticeHours };
  return { percentage: 0, noticeHours };
}

module.exports = { calculateRefund };
