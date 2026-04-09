const Employee = require('../models/EmployeeSchema.js');
const Attendance = require('../models/AttendanceSchema.js');
const OfficeLocation = require('../models/OfficeLocation.js');

// @desc    Get all employees
const getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find().select('-password');
    res.json({
      success: true,
      count: employees.length,
      data: employees,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get employee by ID
const getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).select('-password');
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }
    res.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update employee
const updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }
    
    res.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete employee
const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }
    res.json({
      success: true,
      message: 'Employee deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all attendance records
const getAllAttendance = async (req, res) => {
  try {
    const { date, employeeId, department, startDate, endDate } = req.query;
    let query = {};
    
    if (date) query.date = date;
    if (employeeId) query.employeeId = employeeId;
    
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    let attendanceQuery = Attendance.find(query).sort({ date: -1 });
    
    if (department) {
      const employees = await Employee.find({ department });
      const employeeIds = employees.map(e => e.employeeId);
      attendanceQuery = attendanceQuery.where('employeeId').in(employeeIds);
    }
    
    const attendance = await attendanceQuery;
    
    const attendanceWithDetails = await Promise.all(
      attendance.map(async (record) => {
        const employee = await Employee.findOne({ employeeId: record.employeeId });
        return {
          ...record.toObject(),
          employeeName: employee ? employee.name : 'Unknown',
          employeeEmail: employee ? employee.email : 'Unknown',
          department: employee ? employee.department : 'Unknown',
        };
      })
    );
    
    res.json({
      success: true,
      count: attendanceWithDetails.length,
      data: attendanceWithDetails,
    });
  } catch (error) {
    console.error('Get all attendance error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get attendance summary for all employees
const getAttendanceSummary = async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
    
    let start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    let end = endDate ? new Date(endDate) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    
    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];
    
    let employeesQuery = {};
    if (department && department !== 'all') {
      employeesQuery.department = department;
    }
    const employees = await Employee.find(employeesQuery).select('-password');
    
    const attendanceRecords = await Attendance.find({
      date: { $gte: startDateStr, $lte: endDateStr }
    });
    
    // Calculate working days
    let workingDays = 0;
    let currentDate = new Date(start);
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const summary = employees.map(employee => {
      const employeeRecords = attendanceRecords.filter(
        record => record.employeeId === employee.employeeId
      );
      
      const present = employeeRecords.filter(r => r.status === 'present').length;
      const late = employeeRecords.filter(r => r.status === 'late').length;
      const absent = workingDays - (present + late);
      const totalWorkingHours = employeeRecords.reduce((sum, r) => sum + (r.workingHours || 0), 0);
      const attendancePercentage = workingDays > 0 ? ((present + late) / workingDays * 100) : 0;
      
      let performance = 'Excellent';
      if (attendancePercentage < 75) performance = 'Needs Improvement';
      else if (attendancePercentage < 90) performance = 'Good';
      
      return {
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        department: employee.department,
        presentDays: present,
        lateDays: late,
        absentDays: absent,
        totalDays: present + late + absent,
        workingHours: totalWorkingHours.toFixed(2),
        attendancePercentage: attendancePercentage.toFixed(2),
        performance,
        status: attendancePercentage >= 75 ? 'Good Standing' : attendancePercentage >= 60 ? 'At Risk' : 'Poor'
      };
    });
    
    // Sort by attendance percentage
    summary.sort((a, b) => b.attendancePercentage - a.attendancePercentage);
    
    const totalPresent = summary.reduce((sum, emp) => sum + emp.presentDays, 0);
    const totalLate = summary.reduce((sum, emp) => sum + emp.lateDays, 0);
    const totalAbsent = summary.reduce((sum, emp) => sum + emp.absentDays, 0);
    const avgAttendance = summary.length > 0 ? 
      (summary.reduce((sum, emp) => sum + parseFloat(emp.attendancePercentage), 0) / summary.length).toFixed(2) : 0;
    
    res.json({
      success: true,
      period: {
        startDate: startDateStr,
        endDate: endDateStr,
        workingDays
      },
      overall: {
        totalEmployees: summary.length,
        totalPresentDays: totalPresent,
        totalLateDays: totalLate,
        totalAbsentDays: totalAbsent,
        averageAttendance: avgAttendance
      },
      data: summary
    });
    
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single employee attendance summary
const getEmployeeAttendanceSummary = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.query;
    
    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();
    
    const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];
    
    const employee = await Employee.findOne({ employeeId }).select('-password');
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    const attendanceRecords = await Attendance.find({
      employeeId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1 });
    
    const presentRecords = attendanceRecords.filter(r => r.status === 'present');
    const lateRecords = attendanceRecords.filter(r => r.status === 'late');
    
    // Calculate working days
    let workingDays = 0;
    const dailyBreakdown = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= new Date(endDate)) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      if (!isWeekend) {
        workingDays++;
      }
      
      const record = attendanceRecords.find(r => r.date === dateStr);
      
      dailyBreakdown.push({
        date: dateStr,
        day: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
        isWeekend,
        status: record ? record.status : (isWeekend ? 'weekend' : 'absent'),
        checkInTime: record?.checkInTime || null,
        checkOutTime: record?.checkOutTime || null,
        workingHours: record?.workingHours || 0,
        isLate: record?.status === 'late',
        location: record?.checkInLocation
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const presentDays = presentRecords.length;
    const lateDays = lateRecords.length;
    const absentDays = workingDays - (presentDays + lateDays);
    const attendancePercentage = workingDays > 0 ? ((presentDays + lateDays) / workingDays * 100) : 0;
    const totalWorkingHours = attendanceRecords.reduce((sum, r) => sum + (r.workingHours || 0), 0);
    
    res.json({
      success: true,
      employee: {
        id: employee.employeeId,
        name: employee.name,
        email: employee.email,
        department: employee.department,
        role: employee.role,
        phone: employee.phone,
        joiningDate: employee.joiningDate
      },
      period: {
        month: targetMonth,
        year: targetYear,
        startDate,
        endDate
      },
      summary: {
        totalWorkingDays: workingDays,
        presentDays,
        lateDays,
        absentDays,
        attendancePercentage: attendancePercentage.toFixed(2),
        totalWorkingHours: totalWorkingHours.toFixed(2),
        averageWorkingHours: (presentDays + lateDays) > 0 ? 
          (totalWorkingHours / (presentDays + lateDays)).toFixed(2) : 0
      },
      dailyBreakdown
    });
    
  } catch (error) {
    console.error('Employee summary error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get monthly attendance report
const getMonthlyAttendanceReport = async (req, res) => {
  try {
    const { month, year, department } = req.query;
    
    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();
    
    const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];
    
    let employeesQuery = {};
    if (department && department !== 'all') {
      employeesQuery.department = department;
    }
    const employees = await Employee.find(employeesQuery).select('-password');
    
    const attendanceRecords = await Attendance.find({
      date: { $gte: startDate, $lte: endDate }
    });
    
    // Calculate working days
    let workingDays = 0;
    let currentDate = new Date(startDate);
    while (currentDate <= new Date(endDate)) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const report = employees.map(employee => {
      const employeeRecords = attendanceRecords.filter(
        record => record.employeeId === employee.employeeId
      );
      
      const present = employeeRecords.filter(r => r.status === 'present').length;
      const late = employeeRecords.filter(r => r.status === 'late').length;
      const absent = workingDays - (present + late);
      const totalWorkingHours = employeeRecords.reduce((sum, r) => sum + (r.workingHours || 0), 0);
      const attendanceScore = workingDays > 0 ? ((present + late) / workingDays * 100) : 0;
      
      let performance = 'Excellent';
      if (attendanceScore < 75) performance = 'Needs Improvement';
      else if (attendanceScore < 90) performance = 'Good';
      
      return {
        employeeId: employee.employeeId,
        name: employee.name,
        department: employee.department,
        present,
        late,
        absent,
        totalWorkingHours: totalWorkingHours.toFixed(2),
        attendanceScore: attendanceScore.toFixed(2),
        performance,
      };
    });
    
    report.sort((a, b) => b.attendanceScore - a.attendanceScore);
    
    res.json({
      success: true,
      period: {
        month: targetMonth,
        year: targetYear,
        startDate,
        endDate,
        workingDays
      },
      report,
      summary: {
        totalEmployees: report.length,
        averageAttendance: (report.reduce((sum, r) => sum + parseFloat(r.attendanceScore), 0) / report.length).toFixed(2),
        totalPresentDays: report.reduce((sum, r) => sum + r.present, 0),
        totalLateDays: report.reduce((sum, r) => sum + r.late, 0),
        totalAbsentDays: report.reduce((sum, r) => sum + r.absent, 0),
        bestPerformer: report[0]?.name || 'N/A',
        needsImprovement: report[report.length - 1]?.name || 'N/A'
      }
    });
    
  } catch (error) {
    console.error('Monthly report error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Configure office location
const setOfficeLocation = async (req, res) => {
  try {
    const { latitude, longitude, radius, address, name } = req.body;
    
    await OfficeLocation.updateMany({}, { isActive: false });
    
    const officeLocation = await OfficeLocation.create({
      name: name || 'Main Office',
      latitude,
      longitude,
      radius: radius || 100,
      address,
      isActive: true,
    });
    
    res.json({
      success: true,
      message: 'Office location configured successfully',
      data: officeLocation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get current office location
const getOfficeLocation = async (req, res) => {
  try {
    const officeLocation = await OfficeLocation.findOne({ isActive: true });
    res.json({
      success: true,
      data: officeLocation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  getAllAttendance,
  setOfficeLocation,
  getOfficeLocation,
  getAttendanceSummary,
  getEmployeeAttendanceSummary,
  getMonthlyAttendanceReport
};