const express = require('express');
const router = express.Router();
const {
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  getAllAttendance,
  setOfficeLocation,
  getOfficeLocation,
  alldeleteEmployee,
} = require('../controller/adminController.js');
// const { protect, adminOnly } = require('../middleware/authMiddleware.js');

// All admin routes require authentication and admin role
// router.use( adminOnly);

// Employee management
router.get('/employees', getAllEmployees);
router.get('/employees/:id', getEmployeeById);
router.put('/employees/:id', updateEmployee);
router.delete('/employees/:id', deleteEmployee);
router.delete('/delete-allemployees',alldeleteEmployee)
// Attendance management
router.get('/attendance', getAllAttendance);

// Office location management
router.post('/office-location', setOfficeLocation);
router.get('/office-location', getOfficeLocation);

module.exports = router;