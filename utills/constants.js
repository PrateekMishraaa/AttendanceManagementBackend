module.exports = {
  WORKING_HOURS: {
    START: '09:00',
    END: '18:00',
    LATE_THRESHOLD: '09:15', // After this time, mark as late
  },
  ATTENDANCE_STATUS: {
    PRESENT: 'present',
    ABSENT: 'absent',
    LATE: 'late',
    HALF_DAY: 'half-day',
  },
  DEPARTMENTS: ['IT', 'HR', 'Finance', 'Sales', 'Marketing', 'Operations'],
};