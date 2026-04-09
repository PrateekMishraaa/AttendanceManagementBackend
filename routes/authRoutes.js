const express = require('express');
const router = express.Router();
const { registerEmployee, loginEmployee, getMe } = require('../controller/authController.js');
// const { protect, adminOnly } = require('../middleware/authMiddleware.js');

// Public routes
router.post('/login', loginEmployee);

// Temporary public registration route (for testing only)
router.post('/register', registerEmployee);  // Make it public for now

// Protected routes
router.get('/me',  getMe);

// Admin only routes
// router.post('/register', protect, adminOnly, registerEmployee); // Comment this for now

module.exports = router;