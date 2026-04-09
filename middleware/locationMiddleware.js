const OfficeLocation = require('../models/OfficeLocation.js');
const { isWithinOfficeRadius } = require('../utills/distanceCalculator.js');

const verifyLocation = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Location data is required',
      });
    }

    // Get active office location
    const officeLocation = await OfficeLocation.findOne({ isActive: true });

    if (!officeLocation) {
      return res.status(404).json({
        success: false,
        message: 'Office location not configured',
      });
    }

    const userLocation = { latitude, longitude };
    const isWithinRadius = isWithinOfficeRadius(userLocation, {
      latitude: officeLocation.latitude,
      longitude: officeLocation.longitude,
      radius: officeLocation.radius,
    });

    if (!isWithinRadius) {
      return res.status(400).json({
        success: false,
        message: `You must be within ${officeLocation.radius} meters of the office to mark attendance`,
      });
    }

    req.officeLocation = officeLocation;
    next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying location',
    });
  }
};

module.exports = { verifyLocation };