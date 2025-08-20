const { Router } = require("express");
const demoRoute = require('./demo.route');
const maintenanceRoute = require('./maintenance.route');
const ecommerceRoute = require('./ecommerce.route');

const router = Router();


//API URL: (host):(port)/api/demo
router.use('/demo', demoRoute);

//API URL: (host):(port)/api/maintenance
router.use('/maintenance', maintenanceRoute);

//API URL: (host):(port)/api/ecommerce
router.use('/ecommerce', ecommerceRoute);

// Add routes declaration here:

module.exports = router;