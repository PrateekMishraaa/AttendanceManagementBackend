const mongoose = require("mongoose");
const EmployeeApplication = require("../models/EmployeeApplication.js");

const employeeLeave = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log("Employee ID received:", id);

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

    if (IsHalfDay && !HalfDaySession) {
      return res.status(400).json({ message: "Half day session is required for half day leave" });
    }

    if (ContactNumberDuringLeave && !/^[0-9]{10}$/.test(ContactNumberDuringLeave)) {
      return res.status(400).json({ message: "Please enter valid 10-digit mobile number for contact during leave" });
    }

    if (EmergencyContactNumber && !/^[0-9]{10}$/.test(EmergencyContactNumber)) {
      return res.status(400).json({ message: "Please enter valid 10-digit mobile number for emergency contact" });
    }

    const fromDateObj = new Date(FromDate);
    const toDateObj = new Date(ToDate);
    
    if (toDateObj < fromDateObj) {
      return res.status(400).json({ message: "ToDate must be greater than or equal to FromDate" });
    }

    const existingApplication = await EmployeeApplication.findOne({
      Employeid: id,
      Status: { $in: ["Pending", "Under Review"] }
    });

    if (existingApplication) {
      return res.status(409).json({
        message: "Employee already has a pending leave application. Please wait for approval."
      });
    }

    const leaveData = {
      Employeid: id,
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

    const NewApplication = await EmployeeApplication.create(leaveData);
    
    console.log('Employee has applied for leave:', NewApplication);
    
    return res.status(201).json({
      success: true,
      message: "Leave application submitted successfully",
      application: NewApplication
    });
    
  } catch (error) {
    console.error("Error in employeeLeave:", error);
    
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

const getAllLeaves = async (req, res) => {
  try {
    const allLeaves = await EmployeeApplication.find()
      .populate('Employeid', 'name email employeeCode')
      .sort({ createdAt: -1 });
    
    console.log('all leaves', allLeaves);
    
    return res.status(200).json({
      success: true,
      message: "All leaves fetched from database",
      count: allLeaves.length,
      data: allLeaves
    });
  } catch (error) {
    console.log('error', error);
    return res.status(500).json({
      success: false,
      message: "Failed to get all leaves",
      error: error.message
    });
  }
};

const updateLeave = async (req, res) => {
  const { id } = req.params;
  const { Status } = req.body;
  

  if (!id) {
    return res.status(400).json({ 
      success: false,
      message: "Leave application ID is required" 
    });
  }
  

  if (!Status) {
    return res.status(400).json({ 
      success: false,
      message: "Status is required for update" 
    });
  }
  

  const validStatuses = ["Pending", "Approved", "Rejected", "Cancelled", "Under Review"];
  if (!validStatuses.includes(Status)) {
    return res.status(400).json({ 
      success: false,
      message: "Invalid status. Valid statuses are: Pending, Approved, Rejected, Cancelled, Under Review" 
    });
  }
  
  try {

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid leave application ID format" 
      });
    }
    
 
    const existingLeave = await EmployeeApplication.findById(id);
    
    if (!existingLeave) {
      return res.status(404).json({ 
        success: false,
        message: `Leave application not found with ID: ${id}` 
      });
    }

    const updatedLeave = await EmployeeApplication.findByIdAndUpdate(
      id,
      { 
        $set: {
          Status: Status
        }
      },
      { 
        new: true,         
        runValidators: true  
      }
    );
    
    console.log(`Leave status updated from ${existingLeave.Status} to ${Status}:`, updatedLeave._id);
    
    return res.status(200).json({ 
      success: true,
      message: `Leave status updated to ${Status} successfully`,
      data: {
        _id: updatedLeave._id,
        Status: updatedLeave.Status,
        Employeid: updatedLeave.Employeid,
        LeaveType: updatedLeave.LeaveType,
        FromDate: updatedLeave.FromDate,
        ToDate: updatedLeave.ToDate,
        updatedAt: updatedLeave.updatedAt
      }
    });
    
  } catch (error) {
    console.error('Error updating leave status:', error);
    return res.status(500).json({ 
      success: false,
      message: "Internal server error", 
      error: error.message 
    });
  }
};
const leavesById = async (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ 
      success: false,
      message: "Leave application ID is required" 
    });
  }
  
  try {
    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid leave application ID format" 
      });
    }
    
    const employeeLeaveById = await EmployeeApplication.findById(id)
      .populate('Employeid', 'name email employeeCode')
      .exec();
    
    if (!employeeLeaveById) {
      return res.status(404).json({ 
        success: false,
        message: `Leave application not found with ID: ${id}` 
      });
    }
    
    console.log('Employee leave found:', employeeLeaveById);
    
    return res.status(200).json({ 
      success: true,
      message: "Employee leave application retrieved successfully",
      data: employeeLeaveById
    });
    
  } catch (error) {
    console.error('Error in leavesById:', error);
    return res.status(500).json({ 
      success: false,
      message: "Internal server error", 
      error: error.message 
    });
  }
};


const getLeavesByEmployeeId = async (req, res) => {
  const { employeeId } = req.params;
  
  if (!employeeId) {
    return res.status(400).json({ 
      success: false,
      message: "Employee ID is required" 
    });
  }
  
  try {
    
    let cleanEmployeeId = employeeId.toString().trim();
    
    
    if (cleanEmployeeId.startsWith(':')) {
      cleanEmployeeId = cleanEmployeeId.substring(1);
    }
    
   
    cleanEmployeeId = cleanEmployeeId.replace(/['"]+/g, '');
    
    console.log('Original Employee ID:', employeeId);
    console.log('Cleaned Employee ID:', cleanEmployeeId);
    
  
    const isValidObjectId = mongoose.Types.ObjectId.isValid(cleanEmployeeId);
    
    let query = {};
    
    if (isValidObjectId) {
    
      query = { Employeid: cleanEmployeeId };
      console.log('Querying by ObjectId');
    } else {
     
      query = { Employeid: cleanEmployeeId };
      console.log('Querying by string ID');
    }
    
    const employeeLeaves = await EmployeeApplication.find(query)
      .populate('Employeid', 'name email employeeCode')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${employeeLeaves.length} leaves for employee:`, cleanEmployeeId);
    
    return res.status(200).json({
      success: true,
      message: "Employee leaves fetched successfully",
      count: employeeLeaves.length,
      data: employeeLeaves
    });
    
  } catch (error) {
    console.error('Error fetching employee leaves:', error);
    return res.status(500).json({ 
      success: false,
      message: "Internal server error", 
      error: error.message 
    });
  }
};
module.exports = {
  employeeLeave,
  getAllLeaves,
  updateLeave,
  leavesById,
  getLeavesByEmployeeId
};