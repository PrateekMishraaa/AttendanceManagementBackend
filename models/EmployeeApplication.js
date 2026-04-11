const mongoose = require("mongoose");
const { Schema } = mongoose;

const EmployeeApplicationSchema = new Schema(
  {

    Employeid: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
  
    // Leave Type
    LeaveType: {
      type: String,
      required: [true, "Leave type is required"],
      enum: [
        "Casual Leave",
        "Sick Leave",
        "Earned Leave",
        "Privilege Leave",
        "Compensatory Off",
        "Unpaid Leave",
        "Maternity Leave",
        "Paternity Leave",
        "Study Leave",
        "Other",
      ],
    },
   
    
    // Leave Duration
    FromDate: {
      type: Date,
      required: [true, "Leave start date is required"],
    },
    ToDate: {
      type: Date,
      required: [true, "Leave end date is required"],
      validate: {
        validator: function (value) {
          return value >= this.FromDate;
        },
        message: "ToDate must be greater than or equal to FromDate",
      },
    },
    NumberOfDays: {
      type: Number,
      // required: true,
      min: [0.5, "Number of days must be at least 0.5"],
    },
    IsHalfDay: {
      type: Boolean,
      default: false,
    },
    HalfDaySession: {
      type: String,
      enum: ["First Half", "Second Half", null],
      default: null,
      validate: {
        validator: function (value) {
          if (this.IsHalfDay === true) {
            return value !== null;
          }
          return true;
        },
        message: "Please select First Half or Second Half for half day leave",
      },
    },

    ApplicationReason: {
      type: String,
      required: [true, "Why do you want leave? Please mention this is required"],
    },
  

  
    ContactNumberDuringLeave: {
      type: String,
      match: [/^[0-9]{10}$/, "Please enter valid 10-digit mobile number"],
      default: null,
    },
    EmergencyContactPerson: {
      type: String,
      default: null,
    },
    EmergencyContactNumber: {
      type: String,
      match: [/^[0-9]{10}$/, "Please enter valid 10-digit mobile number"],
      default: null,
    },
    
  
    TaskHandoverTo: {
      type: String,
      default: null,
    },
    PendingWorkStatus: {
      type: String,
      default: null,
    },
    

    AvailableCasualLeave: {
      type: Number,
      default: 0,
    },
    AvailableSickLeave: {
      type: Number,
      default: 0,
    },
  
    
    // Application Status & Tracking
    Status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Cancelled", "Under Review"],
      default: "Pending",
    },
    ApplicationDate: {
      type: Date,
      default: Date.now,
    },
   
   
    
    ResumeDutyDate: {
      type: Date,
      default: null,
    },
   
  },
  {
    timestamps: true, 
  }
);

// Pre-save middleware to auto-calculate number of days
EmployeeApplicationSchema.pre("save", function () {
  if (this.FromDate && this.ToDate) {
    const diffTime = Math.abs(this.ToDate - this.FromDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    if (this.IsHalfDay) {
      this.NumberOfDays = 0.5;
    } else {
      this.NumberOfDays = diffDays;
    }
  }
  
  // Auto-set Resume Duty Date
  if (this.ToDate && !this.IsHalfDay) {
    const resumeDate = new Date(this.ToDate);
    resumeDate.setDate(resumeDate.getDate() + 1);
    this.ResumeDutyDate = resumeDate;
  } else if (this.IsHalfDay && this.FromDate) {
    this.ResumeDutyDate = this.FromDate;
  }
  
  // next();
});

EmployeeApplicationSchema.index({ Employeid: 1, Status: 1 });
EmployeeApplicationSchema.index({ FromDate: -1, ToDate: -1 });
EmployeeApplicationSchema.index({ ReportingManager: 1, Status: 1 });

const EmployeeApplication = mongoose.model("EmployeeApplication", EmployeeApplicationSchema);

module.exports = EmployeeApplication;