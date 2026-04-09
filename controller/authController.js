const Employee = require('../models/EmployeeSchema.js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// @desc    Register employee
// @route   POST /api/auth/register
const registerEmployee = async (req, res) => {
  try {
    const { employeeId, name, email, password, phone, department, role } = req.body;

    // Validation
    if (!employeeId || !name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: employeeId, name, email, password, phone'
      });
    }

    // Check if employee exists
    const employeeExists = await Employee.findOne({ 
      $or: [{ employeeId }, { email }] 
    });
    
    if (employeeExists) {
      return res.status(400).json({
        success: false,
        message: 'Employee already exists with this ID or email',
      });
    }

    // Create employee
    const employee = await Employee.create({
      employeeId,
      name,
      email,
      password,
      phone,
      department: department || 'IT',
      role: role || 'Employee'
    });

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: {
        id: employee._id,
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        department: employee.department,
        role: employee.role
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Login employee
// @route   POST /api/auth/login
const loginEmployee = async (req, res) => {
  const { employeeId, password } = req.body;
  
  if (!employeeId || !password) {
    return res.status(400).json({
      success: false,
      message: "Please provide employeeId and password"
    });
  }
  
  try {
    // Find user by employeeId (NOT by _id)
    const isUserExist = await Employee.findOne({ employeeId });
    
    if (!isUserExist) {
      return res.status(404).json({
        success: false,
        message: "User not found with this Employee ID"
      });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, isUserExist.password);
    
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect Password"
      });
    }
    
    // ✅ FIXED: Create correct payload (NO PASSWORD, USE MongoDB _id)
    const payload = {
      id: isUserExist._id,           // ← MongoDB ObjectId (important!)
      employeeId: isUserExist.employeeId,
      name: isUserExist.name,
      email: isUserExist.email,
      role: isUserExist.role,
      department:isUserExist.department,
      date:isUserExist.joiningDate,
      number:isUserExist.phone
    };
    
    // Generate token
    const token = jwt.sign(payload, process.env.SECRETKEY, { expiresIn: "30d" });
    
    console.log('Login successful for:', isUserExist.name);
    
    return res.status(200).json({
      success: true,
      message: "User Login Successfully",
      token,
      user: {
        id: isUserExist._id,
        employeeId: isUserExist.employeeId,
        name: isUserExist.name,
        email: isUserExist.email,
        department: isUserExist.department,
        role: isUserExist.role
      }
    });
    
  } catch (error) {
    console.log('Login error:', error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// @desc    Get current employee profile
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const employee = await Employee.findById(req.employee._id).select('-password');
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

module.exports = { registerEmployee, loginEmployee, getMe };