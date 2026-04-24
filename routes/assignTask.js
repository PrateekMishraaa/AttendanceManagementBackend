const express = require('express');
const { assignTask, allTask } = require('../controller/assignTask');
const router = express.Router()



router.post('/assign-task',assignTask)
router.get('/get-alltask',allTask)
// router.put('/update-task/:id',updateTask)

module.exports = router;