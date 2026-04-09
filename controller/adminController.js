const Employee = require('../models/EmployeeSchema.js');
const Attendance = require('../models/AttendanceSchema.js');
const OfficeLocation = require('../models/OfficeLocation.js');

// @desc    Get all employees
// @route   GET /api/admin/employees
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
// @route   GET /api/admin/employees/:id
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
// @route   PUT /api/admin/employees/:id
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
// @route   DELETE /api/admin/employees/:id
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
// @route   GET /api/admin/attendance
const getAllAttendance = async (req, res) => {
  try {
    const { date, employeeId, department } = req.query;
    let query = {};
    
    if (date) query.date = date;
    if (employeeId) query.employeeId = employeeId;
    
    let attendanceQuery = Attendance.find(query).sort({ date: -1 });
    
    // If department filter is applied, join with employees
    if (department) {
      const employees = await Employee.find({ department });
      const employeeIds = employees.map(e => e.employeeId);
      attendanceQuery = attendanceQuery.where('employeeId').in(employeeIds);
    }
    
    const attendance = await attendanceQuery;
    
    // Populate employee details
    const attendanceWithDetails = await Promise.all(
      attendance.map(async (record) => {
        const employee = await Employee.findOne({ employeeId: record.employeeId });
        return {
          ...record.toObject(),
          employeeName: employee ? employee.name : 'Unknown',
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
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Configure office location
// @route   POST /api/admin/office-location
const setOfficeLocation = async (req, res) => {
  try {
    const { latitude, longitude, radius, address, name } = req.body;
    
    // Deactivate all existing office locations
    await OfficeLocation.updateMany({}, { isActive: false });
    
    // Create new office location
    const officeLocation = await OfficeLocation.create({
      name: name || 'Main Office',
      latitude,
      longitude,
      radius,
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
// @route   GET /api/admin/office-location
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
};