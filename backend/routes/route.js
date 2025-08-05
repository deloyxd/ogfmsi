const { Router } = require("express");
const salesRoute = require('./sales.route');
const demoRoute = require('./demo.route');

const router = Router();
//API URL: (host):(port)/api/sales
router.use('/sales',salesRoute);
router.use('/demo',demoRoute);
// Add routes declaration here:



module.exports = router;