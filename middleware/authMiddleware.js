const jwt = require('jsonwebtoken');
const Employee = require('../models/EmployeeSchema.js');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.SECRETKEY);
      
      console.log('Decoded token:', decoded); // Debugging
      
      // ✅ FIXED: Find by _id (MongoDB ObjectId)
      req.employee = await Employee.findById(decoded.id).select('-password');

      if (!req.employee) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, employee not found',
        });
      }

      next();
    } catch (error) {
      console.error('Auth error:', error);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token',
    });
  }
};

const adminOnly = (req, res, next) => {
  if (req.employee && req.employee.role === 'Admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only',
    });
  }
};

module.exports = { protect, adminOnly };