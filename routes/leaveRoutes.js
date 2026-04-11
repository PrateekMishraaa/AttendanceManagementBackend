const express = require('express');
const { employeeLeave, getAllLeaves } = require('../controller/employeeLeave.js');
const router = express.Router()

// The parameter is :id
router.post('/employee/leave/:id', employeeLeave);
router.get('/getAllLeaves',getAllLeaves)

module.exports = router;