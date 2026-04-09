const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
  },
  phone: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    enum: ['IT', 'HR', 'Finance', 'Sales', 'Marketing', 'Operations'],
    default: 'IT',
  },
  designation: {
    type: String,
    default: 'Employee',
  },
  profileImage: String,
  isActive: {
    type: Boolean,
    default: true,
  },
  joiningDate: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  role:{
    type:String,
    required:true,
    enum:["Admin","Employee"],
    default:"Employee"
  }
});

// Encrypt password before saving
employeeSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match password method
employeeSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Employee', employeeSchema);