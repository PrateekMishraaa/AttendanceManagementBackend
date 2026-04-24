const Attendance = require('../models/AttendanceSchema.js');
const Employee = require('../models/EmployeeSchema.js');
const { WORKING_HOURS } = require('../utills/constants.js');

const calculateWorkingHours = (checkInTime, checkOutTime) => {
  if (!checkInTime || !checkOutTime) return 0;
  
  const checkIn = new Date(`1970/01/01 ${checkInTime}`);
  const checkOut = new Date(`1970/01/01 ${checkOutTime}`);
  const diff = (checkOut - checkIn) / (1000 * 60 * 60); 
  return Math.max(0, diff);
};

const determineStatus = (checkInTime) => {
  if (!checkInTime) return 'absent';
  
  const lateThreshold = WORKING_HOURS.LATE_THRESHOLD;
  if (checkInTime > lateThreshold) {
    return 'late';
  }
  return 'present';
};


const markCheckIn = async (req, res) => {
  try {
    const { latitude, longitude, time } = req.body;
    
    const employeeId = req.employee._id;  
    
    const today = new Date().toISOString().split('T')[0];


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
   
      attendance = new Attendance({
        employeeId, 
        date: today,
        checkInTime,
        checkInLocation: { latitude, longitude },
        status,
        verified: true,
      });
    } else {
    
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


const markCheckOut = async (req, res) => {
  try {
    const { latitude, longitude, time } = req.body;
    const employeeId = req.employee._id;
    const today = new Date().toISOString().split('T')[0];

    const attendance = await Attendance.findOne({ employeeId, date: today });
    console.log('this is console attandance',attendance)
    
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
    console.log('this is checkout time',checkOutTime)
    attendance.checkOutTime = checkOutTime;
    attendance.checkOutLocation = { latitude, longitude };
    
   
    attendance.workingHours = calculateWorkingHours(attendance.checkInTime, checkOutTime);
    
   
    const standardHours = 9;
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


const getAttendanceHistory = async (req, res) => {
  try {
    const employeeId = req.employee._id; 
    const { startDate, endDate, limit = 30 } = req.query;
    
    let query = { employeeId };
    
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    const history = await Attendance.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit));
    

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


const getTodayStatus = async (req, res) => {
  try {
    const employeeId = req.employee._id; 
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

const getTodayLateEmployees = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
  
    const lateRecords = await Attendance.find({ 
      date: today, 
      status: 'late' 
    }).populate('employeeId', 'name employeeId email department');
    
    // Get detailed information
    const lateEmployees = await Promise.all(lateRecords.map(async (record) => {
      // Get employee details
      const employee = await Employee.findById(record.employeeId).select('-password');
      
      // Calculate how late they were
      const lateThreshold = "10:15:00"; // 10:15 AM
      const checkInTime = record.checkInTime;
      
      let lateMinutes = 0;
      if (checkInTime > lateThreshold) {
        const checkIn = new Date(`1970/01/01 ${checkInTime}`);
        const threshold = new Date(`1970/01/01 ${lateThreshold}`);
        lateMinutes = Math.floor((checkIn - threshold) / (1000 * 60));
      }
      
      return {
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        department: employee.department,
        checkInTime: record.checkInTime,
        lateByMinutes: lateMinutes,
        checkInLocation: record.checkInLocation
      };
    }));
    
    res.json({
      success: true,
      date: today,
      totalLate: lateEmployees.length,
      data: lateEmployees
    });
  } catch (error) {
    console.error('Error fetching late employees:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get monthly attendance report (late arrivals & early departures)
// @route   GET /api/attendance/monthly-report/:year/:month
const getMonthlyAttendanceReport = async (req, res) => {
  try {
    const { year, month } = req.params;
    const { department } = req.query; // Optional department filter
    
    // Create date range for the month
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month
    
    // Build query
    let query = {
      date: { $gte: startDate, $lte: endDate }
    };
    
    // If department filter is provided, get employees from that department first
    let employeeIds = [];
    if (department) {
      const employees = await Employee.find({ department }, '_id');
      employeeIds = employees.map(emp => emp._id);
      query.employeeId = { $in: employeeIds };
    }
    
    // Get all attendance records for the month
    const attendanceRecords = await Attendance.find(query)
      .populate('employeeId', 'name employeeId email department');
    
    // Process records to find late arrivals and early departures
    const lateThreshold = "10:15:00"; // 10:15 AM
    const standardWorkingHours = 9; // 9 hours
    const expectedCheckOut = "19:00:00"; // 7:00 PM
    
    const employeeReport = {};
    
    attendanceRecords.forEach(record => {
      const employee = record.employeeId;
      const empId = employee._id.toString();
      
      if (!employeeReport[empId]) {
        employeeReport[empId] = {
          employeeId: employee.employeeId,
          name: employee.name,
          email: employee.email,
          department: employee.department,
          dailyRecords: [],
          summary: {
            totalDays: 0,
            lateDays: 0,
            earlyDepartureDays: 0,
            totalLateMinutes: 0,
            totalEarlyMinutes: 0,
            presentDays: 0,
            absentDays: 0
          }
        };
      }
      
      const dailyInfo = {
        date: record.date,
        checkInTime: record.checkInTime || 'Absent',
        checkOutTime: record.checkOutTime || 'Not checked out',
        status: record.status,
        workingHours: record.workingHours
      };
      
      // Check for late arrival
      if (record.checkInTime && record.checkInTime > lateThreshold) {
        const checkIn = new Date(`1970/01/01 ${record.checkInTime}`);
        const threshold = new Date(`1970/01/01 ${lateThreshold}`);
        const lateMinutes = Math.floor((checkIn - threshold) / (1000 * 60));
        
        dailyInfo.isLate = true;
        dailyInfo.lateByMinutes = lateMinutes;
        employeeReport[empId].summary.lateDays++;
        employeeReport[empId].summary.totalLateMinutes += lateMinutes;
      } else {
        dailyInfo.isLate = false;
        dailyInfo.lateByMinutes = 0;
      }
      
      // Check for early departure
      if (record.checkOutTime && record.checkOutTime < expectedCheckOut && record.checkInTime) {
        const checkOut = new Date(`1970/01/01 ${record.checkOutTime}`);
        const expected = new Date(`1970/01/01 ${expectedCheckOut}`);
        const earlyMinutes = Math.floor((expected - checkOut) / (1000 * 60));
        
        dailyInfo.isEarlyDeparture = true;
        dailyInfo.earlyByMinutes = earlyMinutes;
        employeeReport[empId].summary.earlyDepartureDays++;
        employeeReport[empId].summary.totalEarlyMinutes += earlyMinutes;
      } else {
        dailyInfo.isEarlyDeparture = false;
        dailyInfo.earlyByMinutes = 0;
      }
      
      if (record.status === 'present' || record.status === 'late') {
        employeeReport[empId].summary.presentDays++;
      } else if (record.status === 'absent') {
        employeeReport[empId].summary.absentDays++;
      }
      
      employeeReport[empId].summary.totalDays++;
      employeeReport[empId].dailyRecords.push(dailyInfo);
    });
    
    // Convert object to array and calculate averages
    const reportData = Object.values(employeeReport).map(emp => ({
      ...emp,
      summary: {
        ...emp.summary,
        averageLateMinutes: emp.summary.lateDays > 0 
          ? (emp.summary.totalLateMinutes / emp.summary.lateDays).toFixed(2) 
          : 0,
        averageEarlyMinutes: emp.summary.earlyDepartureDays > 0 
          ? (emp.summary.totalEarlyMinutes / emp.summary.earlyDepartureDays).toFixed(2) 
          : 0
      }
    }));
    
    // Sort by most late days
    reportData.sort((a, b) => b.summary.lateDays - a.summary.lateDays);
    
    // Get summary for the entire month
    const totalLateDays = reportData.reduce((sum, emp) => sum + emp.summary.lateDays, 0);
    const totalEarlyDepartures = reportData.reduce((sum, emp) => sum + emp.summary.earlyDepartureDays, 0);
    const averageLateMinutes = reportData.length > 0 
      ? (reportData.reduce((sum, emp) => sum + parseFloat(emp.summary.averageLateMinutes), 0) / reportData.length).toFixed(2)
      : 0;
    
    res.json({
      success: true,
      period: {
        year: parseInt(year),
        month: parseInt(month),
        startDate,
        endDate
      },
      department: department || 'All Departments',
      summary: {
        totalEmployees: reportData.length,
        totalLateDays,
        totalEarlyDepartures,
        averageLateMinutes,
        monthName: new Date(year, month - 1).toLocaleString('default', { month: 'long' })
      },
      data: reportData
    });
  } catch (error) {
    console.error('Error fetching monthly report:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get daily late report with filters
// @route   GET /api/attendance/late-report
const getLateReport = async (req, res) => {
  try {
    const { startDate, endDate, department, minLateMinutes } = req.query;
    
    let query = { status: 'late' };
    
    // Date filter
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    // Get late records
    let lateRecords = await Attendance.find(query).populate('employeeId', 'name employeeId email department');
    
    // Filter by department if specified
    if (department) {
      lateRecords = lateRecords.filter(record => 
        record.employeeId?.department === department
      );
    }
    
    // Process records with late minutes calculation
    const lateThreshold = "10:15:00";
    const processedRecords = lateRecords.map(record => {
      let lateMinutes = 0;
      if (record.checkInTime > lateThreshold) {
        const checkIn = new Date(`1970/01/01 ${record.checkInTime}`);
        const threshold = new Date(`1970/01/01 ${lateThreshold}`);
        lateMinutes = Math.floor((checkIn - threshold) / (1000 * 60));
      }
      
      return {
        date: record.date,
        employeeId: record.employeeId?.employeeId,
        name: record.employeeId?.name,
        department: record.employeeId?.department,
        checkInTime: record.checkInTime,
        lateByMinutes: lateMinutes,
        checkOutTime: record.checkOutTime,
        workingHours: record.workingHours
      };
    });
    
    // Filter by minimum late minutes
    const filteredRecords = minLateMinutes 
      ? processedRecords.filter(r => r.lateByMinutes >= parseInt(minLateMinutes))
      : processedRecords;
    
    // Sort by latest date first
    filteredRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json({
      success: true,
      total: filteredRecords.length,
      filters: { startDate, endDate, department, minLateMinutes },
      data: filteredRecords
    });
  } catch (error) {
    console.error('Error fetching late report:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const deleteAllAttandance = async(req,res)=>{
  try{
    const attandancedelete = await Attendance.deleteMany()
    console.log('deleted',attandancedelete)
    return res.status(200).json({message:"Admin deleted the Attandance",attandancedelete})
  }catch(error){
    console.log('error',error)
    return res.status(500).json({message:"Internal server error",error})
  }
}
module.exports = {
  markCheckIn,
  markCheckOut,
  getAttendanceHistory,
  getTodayStatus,
    getTodayLateEmployees,     // New
  getMonthlyAttendanceReport, // New
  getLateReport   ,
  deleteAllAttandance
};