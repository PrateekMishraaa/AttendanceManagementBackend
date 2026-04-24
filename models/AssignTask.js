const mongoose = require('mongoose')

const AssignTaskSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: [true, "Employee Id is required"]
    },
    projectname: {
        type: String,
        required: [true, "Project is required"]
    },
    startDate: {
        type: Date,
        required: [true, "Start date is required"],
        set: function(value) {
            if (!value) return value;
            // Convert DD-MM-YYYY to Date
            if (typeof value === 'string' && value.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
                const parts = value.split('-');
                return new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T00:00:00.000Z`);
            }
            return value;
        }
    },
    taskoverview:{
        type:String,
        required:[true,"Please add task overview for employee"]
    },
    priority:{
        type:String,
        enum:["low","medium","high"],
        default:'',
        required:true
    },
    status:{
        type:String,
        enum:['pending','completed'],
        default:''
    },
    expectedEndDate: {
        type: Date,
        required: [true, "Expected End Date is required"],
        set: function(value) {
            if (!value) return value;
            // Convert DD-MM-YYYY to Date
            if (typeof value === 'string' && value.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
                const parts = value.split('-');
                return new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T00:00:00.000Z`);
            }
            return value;
        }
    },
    projectManager: {
        type: String,
        required: [true, "Please enter Project Manager name"]
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('AssignTaskToEmployee', AssignTaskSchema)