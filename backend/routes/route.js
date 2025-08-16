const { Router } = require("express");
const demoRoute = require('./demo.route');
const maintenanceRoute = require('./maintenance.route');

const router = Router();


//API URL: (host):(port)/api/demo
router.use('/demo', demoRoute);

//API URL: (host):(port)/api/maintenance
router.use('/maintenance', maintenanceRoute);

// Add routes declaration here:

module.exports = router;