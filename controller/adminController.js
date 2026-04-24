const Employee = require('../models/EmployeeSchema.js');
const Attendance = require('../models/AttendanceSchema.js');
const OfficeLocation = require('../models/OfficeLocation.js');
const redisCache = require('../middleware/redis.js');


const CACHE_KEYS = {
  ALL_EMPLOYEES: 'employees:all',
  EMPLOYEE_BY_ID: (id) => `employee:${id}`,
  ALL_ATTENDANCE: (query) => `attendance:all:${JSON.stringify(query)}`,
  ATTENDANCE_SUMMARY: (query) => `attendance:summary:${JSON.stringify(query)}`,
  EMPLOYEE_SUMMARY: (employeeId, month, year) => `attendance:employee:${employeeId}:${month}:${year}`,
  MONTHLY_REPORT: (month, year, department) => `attendance:report:${month}:${year}:${department || 'all'}`,
  OFFICE_LOCATION: 'office:location'
};


const getAllEmployees = async (req, res) => {
  const cacheKey = CACHE_KEYS.ALL_EMPLOYEES;
  
  try {
    
    const cachedData = await redisCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`Cache HIT: ${cacheKey}`);
      return res.json({
        success: true,
        source: 'cache',
        ...cachedData
      });
    }
    
    console.log(`Cache MISS: ${cacheKey}, fetching from database`);
    
 
    const employees = await Employee.find().select('-password');
    
    const responseData = {
      count: employees.length,
      data: employees,
    };
    
    
    await redisCache.set(cacheKey, responseData, 300);
    
    res.json({
      success: true,
      source: 'database',
      ...responseData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const getEmployeeById = async (req, res) => {
  const cacheKey = CACHE_KEYS.EMPLOYEE_BY_ID(req.params.id);
  
  try {
  
    const cachedData = await redisCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`Cache HIT: ${cacheKey}`);
      return res.json({
        success: true,
        source: 'cache',
        data: cachedData
      });
    }
    
    console.log(`Cache MISS: ${cacheKey}, fetching from database`);
    
    
    const employee = await Employee.findById(req.params.id).select('-password');
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }
    
   
    await redisCache.set(cacheKey, employee, 600);
    
    res.json({
      success: true,
      source: 'database',
      data: employee,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


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
    
 
    await redisCache.del(CACHE_KEYS.ALL_EMPLOYEES);
    await redisCache.del(CACHE_KEYS.EMPLOYEE_BY_ID(req.params.id));
    
    console.log(`Cache cleared for: employees and employee ${req.params.id}`);
    
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


const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }
    

    await redisCache.del(CACHE_KEYS.ALL_EMPLOYEES);
    await redisCache.del(CACHE_KEYS.EMPLOYEE_BY_ID(req.params.id));
    
    console.log(`Cache cleared for: employees and employee ${req.params.id}`);
    
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

const alldeleteEmployee = async(req,res)=>{
  try{
    const allemployeeDelete = await Employee.deleteMany();
    
   
    await redisCache.delPattern('employees:*');
    await redisCache.delPattern('employee:*');
    
    console.log('All employee caches cleared');
    
    console.log('All Employee has been deleted', allemployeeDelete);
    return res.status(200).json({message:"Employee deleted successfully", allemployeeDelete});
  }catch(error){
    console.log('error',error);
    return res.status(500).json({message:"Internal server error",error});
  }
};


const getAllAttendance = async (req, res) => {
  const { date, employeeId, department, startDate, endDate } = req.query;
  console.log(date,employeeId,department,startDate,endDate,)
  const cacheKey = CACHE_KEYS.ALL_ATTENDANCE({ date, employeeId, department, startDate, endDate });
  console.log('cache key from admin controller',cacheKey)
  try {
  
    const cachedData = await redisCache.get(cacheKey);
    console.log('cached data from admin controller',cachedData)
    if (cachedData) {
      console.log(`Cache HIT: ${cacheKey}`);
      return res.json({
        success: true,
        source: 'cache',
        ...cachedData
      });
    }
    
    console.log(`Cache MISS: ${cacheKey}, fetching from database`);
    
    let query = {};
    if (date) query.date = date;
    if (employeeId) query.employeeId = employeeId;
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    let attendanceQuery = Attendance.find(query).sort({ date: -1 });
    console.log('attendance query from admin controller',attendanceQuery)
    if (department) {
      const employees = await Employee.find({ department });
      const employeeIds = employees.map(e => e.employeeId);
      attendanceQuery = attendanceQuery.where('employeeId').in(employeeIds);
    }
    
    const attendance = await attendanceQuery;
    console.log('attendance data from admin controller',attendance)
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
    
    const responseData = {
      count: attendanceWithDetails.length,
      data: attendanceWithDetails,
    };
    console.log('response data from admin controller',responseData)
    
    
    await redisCache.set(cacheKey, responseData, 180);
    
    res.json({
      success: true,
      source: 'database',
      ...responseData
    });
  } catch (error) {
    console.error('Get all attendance error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const getAttendanceSummary = async (req, res) => {
  const { startDate, endDate, department } = req.query;
  const cacheKey = CACHE_KEYS.ATTENDANCE_SUMMARY({ startDate, endDate, department });
  console.log('cache key from admin controller')
  try {

    const cachedData = await redisCache.get(cacheKey);
      console.log('cached data from admin controller from redis cache',cachedData)
    if (cachedData) {
      console.log(`Cache HIT: ${cacheKey}`);
      return res.json({
        success: true,
        source: 'cache',
        ...cachedData
      });
    }
    
    console.log(`Cache MISS: ${cacheKey}, fetching from database`);
    
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
    
    summary.sort((a, b) => b.attendancePercentage - a.attendancePercentage);
    
    const totalPresent = summary.reduce((sum, emp) => sum + emp.presentDays, 0);
    const totalLate = summary.reduce((sum, emp) => sum + emp.lateDays, 0);
    const totalAbsent = summary.reduce((sum, emp) => sum + emp.absentDays, 0);
    const avgAttendance = summary.length > 0 ? 
      (summary.reduce((sum, emp) => sum + parseFloat(emp.attendancePercentage), 0) / summary.length).toFixed(2) : 0;
    
    const responseData = {
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
    };
    
  
    await redisCache.set(cacheKey, responseData, 300);
    
    res.json({
      success: true,
      source: 'database',
      ...responseData
    });
    
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


const getEmployeeAttendanceSummary = async (req, res) => {
  const { employeeId } = req.params;
  const { month, year } = req.query;
  const targetMonth = month || new Date().getMonth() + 1;
  const targetYear = year || new Date().getFullYear();
  const cacheKey = CACHE_KEYS.EMPLOYEE_SUMMARY(employeeId, targetMonth, targetYear);
  
  try {
  
    const cachedData = await redisCache.get(cacheKey);
      console.log("cached hit by using API",cachedData)
    if (cachedData) {
      console.log(`Cache HIT: ${cacheKey}`);
      return res.json({
        success: true,
        source: 'cache',
        ...cachedData
      });
    }
    
    console.log(`Cache MISS: ${cacheKey}, fetching from database`);
    
    
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
    
    const responseData = {
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
    };
    
  
    await redisCache.set(cacheKey, responseData, 300);
    
    res.json({
      success: true,
      source: 'database',
      ...responseData
    });
    
  } catch (error) {
    console.error('Employee summary error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


const getMonthlyAttendanceReport = async (req, res) => {
  const { month, year, department } = req.query;
  const targetMonth = month || new Date().getMonth() + 1;
  const targetYear = year || new Date().getFullYear();
  const cacheKey = CACHE_KEYS.MONTHLY_REPORT(targetMonth, targetYear, department);
  
  try {
   
    const cachedData = await redisCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`Cache HIT: ${cacheKey}`);
      return res.json({
        success: true,
        source: 'cache',
        ...cachedData
      });
    }
    
    console.log(`Cache MISS: ${cacheKey}, fetching from database`);
    
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
    
    const responseData = {
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
    };
    
 
    await redisCache.set(cacheKey, responseData, 600);
    
    res.json({
      success: true,
      source: 'database',
      ...responseData
    });
    
  } catch (error) {
    console.error('Monthly report error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


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
    
    await redisCache.del(CACHE_KEYS.OFFICE_LOCATION);
    
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


const getOfficeLocation = async (req, res) => {
  const cacheKey = CACHE_KEYS.OFFICE_LOCATION;
  
  try {

    const cachedData = await redisCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`Cache HIT: ${cacheKey}`);
      return res.json({
        success: true,
        source: 'cache',
        data: cachedData
      });
    }
    
    console.log(`Cache MISS: ${cacheKey}, fetching from database`);
    
    const officeLocation = await OfficeLocation.findOne({ isActive: true });
    

    if (officeLocation) {
      await redisCache.set(cacheKey, officeLocation, 3600);
    }
    
    res.json({
      success: true,
      source: 'database',
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
  alldeleteEmployee,
  getAllAttendance,
  setOfficeLocation,
  getOfficeLocation,
  getAttendanceSummary,
  getEmployeeAttendanceSummary,
  getMonthlyAttendanceReport
};