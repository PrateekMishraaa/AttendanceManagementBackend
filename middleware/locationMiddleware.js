const OfficeLocation = require('../models/OfficeLocation.js');
const { isWithinOfficeRadius } = require('../utills/distanceCalculator.js');

const verifyLocation = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;
    console.log('this is cordinates',latitude,longitude)
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Location data is required',
      });
    }


    const officeLocation = await OfficeLocation.findOne({ isActive: true });
    console.log('this is office location',officeLocation)
    if (!officeLocation) {
      return res.status(404).json({
        success: false,
        message: 'Office location not configured',
      });
    }

    const userLocation = { latitude, longitude };
    console.log('this is user location',userLocation)
    const isWithinRadius = isWithinOfficeRadius(userLocation, {
      latitude: officeLocation.latitude,
      longitude: officeLocation.longitude,
      radius: officeLocation.radius,
    });
    console.log('this is is within radius',isWithinRadius)
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