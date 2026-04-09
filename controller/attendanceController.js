const Attendance = require('../models/AttendanceSchema.js');
const Employee = require('../models/EmployeeSchema.js');
const { WORKING_HOURS } = require('../utills/constants.js');

// Helper function to calculate working hours
const calculateWorkingHours = (checkInTime, checkOutTime) => {
  if (!checkInTime || !checkOutTime) return 0;
  
  const checkIn = new Date(`1970/01/01 ${checkInTime}`);
  const checkOut = new Date(`1970/01/01 ${checkOutTime}`);
  const diff = (checkOut - checkIn) / (1000 * 60 * 60); // hours
  return Math.max(0, diff);
};

// Helper function to determine status
const determineStatus = (checkInTime) => {
  if (!checkInTime) return 'absent';
  
  const lateThreshold = WORKING_HOURS.LATE_THRESHOLD;
  if (checkInTime > lateThreshold) {
    return 'late';
  }
  return 'present';
};

// @desc    Mark check-in
// @route   POST /api/attendance/checkin
// @desc    Mark check-in
// @route   POST /api/attendance/checkin
const markCheckIn = async (req, res) => {
  try {
    const { latitude, longitude, time } = req.body;
    
    // ✅ यहाँ employeeId सही तरीके से access करें
    const employeeId = req.employee._id;  // ← change from req.employee.employeeId to req.employee._id
    
    const today = new Date().toISOString().split('T')[0];

    // Check if already checked in today
    let attendance = await Attendance.findOne({ employeeId, date: today });
    console.log('this is attendance', attendance);
    
    if (attendance && attendance.checkInTime) {
      return res.status(400).json({
        success: false,
        message: 'You have already checked in today',
      });
    }

    const checkInTime = time || new Date().toLocaleTimeString('en-US', { hour12: false });
    console.log('check in time', checkInTime);
    
    const status = determineStatus(checkInTime);

    if (!attendance) {
      // Create new attendance record
      attendance = new Attendance({
        employeeId,  // ← यह ObjectId होगा
        date: today,
        checkInTime,
        checkInLocation: { latitude, longitude },
        status,
        verified: true,
      });
    } else {
      // Update existing record
      attendance.checkInTime = checkInTime;
      attendance.checkInLocation = { latitude, longitude };
      attendance.status = status;
      attendance.verified = true;
    }

    await attendance.save();
    console.log('attendance saved', attendance);
    
    res.json({
      success: true,
      message: `Check-in successful at ${checkInTime}`,
      data: { status, checkInTime },
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Mark check-out
// @route   POST /api/attendance/checkout
const markCheckOut = async (req, res) => {
  try {
    const { latitude, longitude, time } = req.body;
    const employeeId = req.employee._id;  // ← यहाँ भी change करें
    const today = new Date().toISOString().split('T')[0];

    // Find today's attendance
    const attendance = await Attendance.findOne({ employeeId, date: today });
    
    if (!attendance || !attendance.checkInTime) {
      return res.status(400).json({
        success: false,
        message: 'You need to check in first before checking out',
      });
    }

    if (attendance.checkOutTime) {
      return res.status(400).json({
        success: false,
        message: 'You have already checked out today',
      });
    }

    const checkOutTime = time || new Date().toLocaleTimeString('en-US', { hour12: false });
    attendance.checkOutTime = checkOutTime;
    attendance.checkOutLocation = { latitude, longitude };
    
    // Calculate working hours
    attendance.workingHours = calculateWorkingHours(attendance.checkInTime, checkOutTime);
    
    // Calculate overtime (if any)
    const standardHours = 9; // 9 hours including lunch
    attendance.overtime = Math.max(0, attendance.workingHours - standardHours);

    await attendance.save();

    res.json({
      success: true,
      message: `Check-out successful at ${checkOutTime}`,
      data: {
        checkOutTime,
        workingHours: attendance.workingHours.toFixed(2),
        overtime: attendance.overtime.toFixed(2),
      },
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get attendance history
// @route   GET /api/attendance/history
const getAttendanceHistory = async (req, res) => {
  try {
    const employeeId = req.employee._id;  // ← यहाँ भी change करें
    const { startDate, endDate, limit = 30 } = req.query;
    
    let query = { employeeId };
    
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    const history = await Attendance.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit));
    
    // Calculate summary
    const summary = {
      totalPresent: history.filter(a => a.status === 'present').length,
      totalLate: history.filter(a => a.status === 'late').length,
      totalAbsent: history.filter(a => a.status === 'absent').length,
      totalWorkingHours: history.reduce((sum, a) => sum + a.workingHours, 0).toFixed(2),
    };
    
    res.json({
      success: true,
      summary,
      count: history.length,
      data: history,
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get today's status
// @route   GET /api/attendance/today
const getTodayStatus = async (req, res) => {
  try {
    const employeeId = req.employee._id;  // ← यहाँ भी change करें
    const today = new Date().toISOString().split('T')[0];
    
    const attendance = await Attendance.findOne({ employeeId, date: today });
    
    res.json({
      success: true,
      data: attendance || { status: 'not_marked', message: 'No attendance marked today' },
    });
  } catch (error) {
    console.error('Today status error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  markCheckIn,
  markCheckOut,
  getAttendanceHistory,
  getTodayStatus,
};