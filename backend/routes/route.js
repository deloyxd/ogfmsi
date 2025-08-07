const { Router } = require("express");
const salesRoute = require('./sales.route');
const demoRoute = require('./demo.route');
const storeRoute = require('./store.route');
const accessControlRoute = require('./access-control.route');
const checkinsRoute = require('./checkins.route');
const maintenanceRoute = require('./maintenance.route');
const dashboardRoute = require('./dashboard.route');

const router = Router();

//API URL: (host):(port)/api/sales
router.use('/sales', salesRoute);

//API URL: (host):(port)/api/demo
router.use('/demo', demoRoute);

//API URL: (host):(port)/api/store
router.use('/store', storeRoute);

//API URL: (host):(port)/api/access-control
router.use('/access-control', accessControlRoute);

//API URL: (host):(port)/api/checkins
router.use('/checkins', checkinsRoute);

//API URL: (host):(port)/api/maintenance
router.use('/maintenance', maintenanceRoute);

//API URL: (host):(port)/api/dashboard
router.use('/dashboard', dashboardRoute);

// Add routes declaration here:

module.exports = router;