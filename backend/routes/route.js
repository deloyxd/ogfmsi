const { Router } = require("express");

// For demo routes
const demoRoute = require('./demo.route');

// For equipment routes
const equipmentRoute = require('./equipment.route');
const equipmentMaintenanceRoute = require('./equipment_maintenance.route');
const equipmentStatsRoute = require('./equipment_stats.route');

// For ecommerce routes
const ecommerceProductsRoute = require('./ecommerce.products.route');
const ecommerceCartRoute = require('./ecommerce.cart.route');
const ecommerceOrdersRoute = require('./ecommerce.orders.route');
const ecommerceUtilsRoute = require('./ecommerce.utils.route');

// For inquiry routes
const inquiryCustomers = require('./inquiry.customer.route');
const inquiryMonthly = require('./inquiry.monthly.route');
const inquiryCheckins = require('./inquiry.checkins.route');

// For payment route
const paymentPendingRoute = require('./payment.pending.route');
const paymentCompleteRoute = require('./payment.complete.route');

const router = Router();

//API URL: (host):(port)/api/demo
router.use('/demo', demoRoute);

//API URL: (host):(port)/api/maintenance/equipment
router.use('/maintenance/equipment', equipmentRoute);

//API URL: (host):(port)/api/maintenance
router.use('/maintenance', equipmentMaintenanceRoute);

//API URL: (host):(port)/api/maintenance/stats
router.use('/maintenance/stats', equipmentStatsRoute);

//API URL: (host):(port)/api/ecommerce
router.use('/ecommerce', ecommerceProductsRoute);
router.use('/ecommerce', ecommerceCartRoute);
router.use('/ecommerce', ecommerceOrdersRoute);
router.use('/ecommerce', ecommerceUtilsRoute);

// API URL: (host):(port)/api/inquiry
router.use('/inquiry', inquiryCustomers);
router.use('/inquiry', inquiryMonthly);
router.use('/inquiry', inquiryCheckins);

// API URL: (host):(port)/api/payment
router.use('/payment', paymentPendingRoute);
router.use('/payment', paymentCompleteRoute);

// Add routes declaration here:

module.exports = router;