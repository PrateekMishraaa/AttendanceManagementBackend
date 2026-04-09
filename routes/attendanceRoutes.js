const express = require('express');
const router = express.Router();
const {
  markCheckIn,
  markCheckOut,
  getAttendanceHistory,
  getTodayStatus,
} = require('../controller/attendanceController.js');
const { protect } = require('../middleware/authMiddleware.js');
const { verifyLocation } = require('../middleware/locationMiddleware.js');

// All routes require authentication
router.use(protect);

// Attendance marking routes with location verification
router.post('/checkin', verifyLocation, markCheckIn);
router.post('/checkout', verifyLocation, markCheckOut);

// Query routes
router.get('/history', getAttendanceHistory);
router.get('/today', getTodayStatus);

module.exports = router;