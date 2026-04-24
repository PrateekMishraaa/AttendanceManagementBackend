module.exports = {
  WORKING_HOURS: {
    START: '10:00',
    END: '19:00',
    LATE_THRESHOLD: '10:15', // After this time, mark as late
  },
  ATTENDANCE_STATUS: {
    PRESENT: 'present',
    ABSENT: 'absent',
    LATE: 'late',
    HALF_DAY: 'half-day',
  },
  DEPARTMENTS: ['IT', 'HR', 'Finance', 'Sales', 'Marketing', 'Operations'],
};