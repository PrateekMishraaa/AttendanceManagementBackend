const mongoose = require("mongoose");
const EmployeeApplication = require("../models/EmployeeApplication.js");

const employeeLeave = async (req, res) => {
  try {
    // Extract id from params - use 'id' not 'Employeid'
    const { id } = req.params;  // ✅ This is correct for your route
    // OR
    // const id = req.params.id;  // This also works
    
    console.log("Employee ID received:", id); // This should now show the ID

    const {
      LeaveType,
      FromDate,
      ToDate,
      IsHalfDay,
      HalfDaySession,
      ApplicationReason,
      ContactNumberDuringLeave,
      EmergencyContactPerson,
      EmergencyContactNumber,
      TaskHandoverTo,
      PendingWorkStatus,
      AvailableCasualLeave,
      AvailableSickLeave,
    } = req.body;

    // Validate required fields
    if (!id) {
      return res.status(400).json({ message: "Employee ID is required" });
    }

    if (!LeaveType) {
      return res.status(400).json({ message: "Leave type is required" });
    }

    if (!FromDate) {
      return res.status(400).json({ message: "Leave start date is required" });
    }

    if (!ToDate) {
      return res.status(400).json({ message: "Leave end date is required" });
    }

    if (!ApplicationReason) {
      return res.status(400).json({ message: "Application reason is required" });
    }

    // Validate half day session if it's a half day leave
    if (IsHalfDay && !HalfDaySession) {
      return res.status(400).json({ message: "Half day session is required for half day leave" });
    }

    // Validate contact number format if provided
    if (ContactNumberDuringLeave && !/^[0-9]{10}$/.test(ContactNumberDuringLeave)) {
      return res.status(400).json({ message: "Please enter valid 10-digit mobile number for contact during leave" });
    }

    if (EmergencyContactNumber && !/^[0-9]{10}$/.test(EmergencyContactNumber)) {
      return res.status(400).json({ message: "Please enter valid 10-digit mobile number for emergency contact" });
    }

    // Validate dates
    const fromDateObj = new Date(FromDate);
    const toDateObj = new Date(ToDate);
    
    if (toDateObj < fromDateObj) {
      return res.status(400).json({ message: "ToDate must be greater than or equal to FromDate" });
    }

    // Check if employee already has a pending application
    const existingApplication = await EmployeeApplication.findOne({
      Employeid: id,  // Use 'id' here
      Status: { $in: ["Pending", "Under Review"] }
    });

    if (existingApplication) {
      return res.status(409).json({
        message: "Employee already has a pending leave application. Please wait for approval."
      });
    }

    // Create leave application object
    const leaveData = {
      Employeid: id,  // Use 'id' here
      LeaveType,
      FromDate: fromDateObj,
      ToDate: toDateObj,
      IsHalfDay: IsHalfDay || false,
      HalfDaySession: HalfDaySession || null,
      ApplicationReason,
      ContactNumberDuringLeave: ContactNumberDuringLeave || null,
      EmergencyContactPerson: EmergencyContactPerson || null,
      EmergencyContactNumber: EmergencyContactNumber || null,
      TaskHandoverTo: TaskHandoverTo || null,
      PendingWorkStatus: PendingWorkStatus || null,
      AvailableCasualLeave: AvailableCasualLeave || 0,
      AvailableSickLeave: AvailableSickLeave || 0,
    };

    // Create new leave application
    const NewApplication = await EmployeeApplication.create(leaveData);
    
    console.log('Employee has applied for leave:', NewApplication);
    
    return res.status(201).json({
      success: true,
      message: "Leave application submitted successfully",
      application: NewApplication
    });
    
  } catch (error) {
    console.error("Error in employeeLeave:", error);
    
    // Handle mongoose validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: "Validation error", 
        errors: validationErrors 
      });
    }
    
    return res.status(500).json({ 
      success: false,
      message: "Internal server error", 
      error: error.message 
    });
  }
};
const getAllLeaves= async(req,res)=>{
  try{
    const allLeaves = await EmployeeApplication.find()
    console.log('all leaves',allLeaves)
    return res.status(200).json({message:"All leaves fetched from database",allLeaves})
  }catch(error){
    console.log('error',error)
    return res.status(500).json({message:"failed to get all leaves"})
  }
}
module.exports = {
  employeeLeave,
  getAllLeaves
};