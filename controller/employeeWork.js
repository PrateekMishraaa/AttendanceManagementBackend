const EmployeeWork = require('../models/EmployeWork.js');

const employeeTodaysWork = async (req, res) => {
    const { id } = req.params;
    console.log('this is user id', id);
    
    const { date, project_name, taskOverview } = req.body;
    
    if (!id) {
        return res.status(400).json({ message: "Employee ID is required" });
    }
    
    if (!date || !project_name || !taskOverview) {
        return res.status(400).json({ message: "All fields (date, project_name, taskOverview) are required" });
    }
    
    try {
      
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        
        const existingTask = await EmployeeWork.findOne({
            employeeId: id,
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });
        
        if (existingTask) {
            return res.status(409).json({ 
                message: "Employee has already posted a task for today",
                existingTask: existingTask
            });
        }
        
      
        const newTask = await EmployeeWork.create({
            employeeId: id,  
            date: date,
            project_name: project_name,
            taskOverview: taskOverview
        });
        
        console.log('Task created successfully', newTask);
        
        return res.status(201).json({ 
            message: "Task created successfully", 
            task: newTask 
        });
        
    } catch (error) {
        console.log('Error creating task:', error);
        return res.status(500).json({ 
            message: "Internal server error", 
            error: error.message 
        });
    }
};

const getEmployeeWorkHistory = async (req, res) => {
    const { id } = req.params;
    
    try {
        const workHistory = await EmployeeWork.find({ employeeId: id })
            .sort({ date: -1 }); // Most recent first
        
        return res.status(200).json({
            success: true,
            count: workHistory.length,
            data: workHistory
        });
    } catch (error) {
        console.log('Error fetching work history:', error);
        return res.status(500).json({ 
            message: "Internal server error", 
            error: error.message 
        });
    }
};

// Optional: Get work for a specific date
const getEmployeeWorkByDate = async (req, res) => {
    const { id, date } = req.params;
    
    try {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        const work = await EmployeeWork.findOne({
            employeeId: id,
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });
        
        if (!work) {
            return res.status(404).json({ 
                message: "No work record found for this date" 
            });
        }
        
        return res.status(200).json({
            success: true,
            data: work
        });
    } catch (error) {
        console.log('Error fetching work:', error);
        return res.status(500).json({ 
            message: "Internal server error", 
            error: error.message 
        });
    }
};


const allEmployeeWork = async(req,res)=>{
        try{
            const allwork = await EmployeeWork.find()
            console.log('all work',allwork)
            return res.status(200).json({message:"all employee work",allwork})
        }catch(error){
            console.log('error',error)
            return res.status(500).json({message:"Internal server error",error})
        }
}

module.exports = {
    employeeTodaysWork,
    getEmployeeWorkHistory,
    getEmployeeWorkByDate,
    allEmployeeWork
};