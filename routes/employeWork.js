const express = require('express')
const { employeeTodaysWork } = require('../controller/employeeWork')
const router = express.Router()



router.post('/todays-work/:id',employeeTodaysWork)

module.exports = router