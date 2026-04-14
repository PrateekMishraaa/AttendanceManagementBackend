const mongoose = require('mongoose');

const EmployeWorkSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    date: {
        type: Date,
        required: [true, "Please Mention Date for Task"]
    },
    project_name: {
        type: String,
        required: true
    },
    taskOverview: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

const EmployeeWork = mongoose.model('EmployeeWork', EmployeWorkSchema);
module.exports = EmployeeWork;