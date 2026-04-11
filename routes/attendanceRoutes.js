const express = require('express');
const router = express.Router();
const {
  markCheckIn,
  markCheckOut,
  getAttendanceHistory,
  getTodayStatus,
  getTodayLateEmployees,
  getMonthlyAttendanceReport,
  getLateReport,
  deleteAllAttandance
} = require('../controller/attendanceController.js');
const { protect } = require('../middleware/authMiddleware.js');
const { verifyLocation } = require('../middleware/locationMiddleware.js');

// All routes require authentication
router.use(protect);

// Attendance marking routes
router.post('/checkin', verifyLocation, markCheckIn);
router.post('/checkout', verifyLocation, markCheckOut);

// Query routes
router.get('/history', getAttendanceHistory);
router.get('/today', getTodayStatus);

// NEW ROUTES - Late & Monthly Reports
router.get('/today/late', getTodayLateEmployees);           // Today's late employees
router.get('/monthly-report/:year/:month', getMonthlyAttendanceReport); // Monthly report
router.get('/late-report', getLateReport);   
router.delete('/delete-all-attandance', deleteAllAttandance);                  // Custom late report

module.exports = router;