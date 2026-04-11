const express = require('express');
const { employeeLeave } = require('../controller/employeeLeave.js');
const router = express.Router()

// The parameter is :id
router.post('/employee/leave/:id', employeeLeave);

module.exports = router;