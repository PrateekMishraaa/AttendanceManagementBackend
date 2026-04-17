const express = require('express');
const { assignTask, allTask } = require('../controller/assignTask');
const router = express.Router()



router.post('/assign-task',assignTask)
router.get('/get-alltask',allTask)

module.exports = router;