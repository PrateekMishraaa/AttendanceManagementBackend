const assign = require('../models/AssignTask.js')

// Helper function to convert DD-MM-YYYY to Date object
function parseDate(dateString) {
    const parts = dateString.split('-');
    // Handle both "DD-M-YYYY" and "DD-MM-YYYY" formats
    if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        // Create date in YYYY-MM-DD format which JS can parse
        return new Date(`${year}-${month}-${day}`);
    }
    return new Date(dateString);
}

const assignTask = async(req,res)=>{
    const {employeeId,projectname,startDate,expectedEndDate,projectManager,taskoverview,priority} = req.body;
    if(!employeeId || !projectname || !startDate || !expectedEndDate || !projectManager || !taskoverview || !priority){
        return res.status(400).json({message:"All fields are required"})
    }
    try{
        // Convert dates before saving
        const formattedStartDate = parseDate(startDate);
        const formattedEndDate = parseDate(expectedEndDate);
        
        // Validate if dates are valid
        if (isNaN(formattedStartDate.getTime()) || isNaN(formattedEndDate.getTime())) {
            return res.status(400).json({message:"Invalid date format. Use DD-MM-YYYY"})
        }
        
        const NewAssignTask = await assign.create({
            employeeId,
            projectname,
            taskoverview,
            priority,
            startDate: formattedStartDate,
            expectedEndDate: formattedEndDate,
            projectManager
        })
        console.log('new assign task',NewAssignTask)
        return res.status(200).json({message:"Task Assign Succesfully",task:NewAssignTask})
    }catch(error){
        console.log('error',error)
        return res.status(500).json({message:"Internal server error",error})
    }
}

const allTask = async(req,res)=>{
    try{
        const tasks = await assign.find()
        console.log('all task fetched from db',tasks)
        return res.status(200).json({message:"All task fetched from db",tasks})
    }catch(error){
        console.log('error',error)
        return res.status(500).json({message:"internal server error",error})
    }
}

module.exports={
    assignTask,
    allTask
}