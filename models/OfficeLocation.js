const mongoose = require('mongoose');

const officeLocationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    default: 'Main Office',
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  radius: {
    type: Number,
    required: true,
    default: 100, // meters
  },
  address: String,
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('OfficeLocation', officeLocationSchema);