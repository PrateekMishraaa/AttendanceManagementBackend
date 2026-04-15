const express = require('express')
const { employeeTodaysWork, allEmployeeWork } = require('../controller/employeeWork')
const router = express.Router()



router.post('/todays-work/:id',employeeTodaysWork)
router.get('/worklist',allEmployeeWork)
module.exports = router