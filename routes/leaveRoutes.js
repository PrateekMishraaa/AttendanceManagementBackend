const express = require('express');
const { employeeLeave, getAllLeaves,updateLeave, leavesById, getLeavesByEmployeeId } = require('../controller/employeeLeave.js');
const router = express.Router()

// The parameter is :id
router.post('/employee/leave/:id', employeeLeave);
router.get('/getAllLeaves',getAllLeaves)
router.put('/update-leave/:id',updateLeave)
router.get('/employee-leave/:id',leavesById)
router.get('/employee/:employeeId/all-leaves', getLeavesByEmployeeId);  

module.exports = router;