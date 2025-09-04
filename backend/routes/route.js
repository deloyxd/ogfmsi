const { Router } = require("express");

// For demo routes
const demoRoute = require('./demo.route');

// For maintenance routes
const maintenanceRoute = require('./maintenance.route');

// For ecommerce routes
const ecommerceProductsRoute = require('./ecommerce.products.route');
const ecommerceCartRoute = require('./ecommerce.cart.route');
const ecommerceOrdersRoute = require('./ecommerce.orders.route');
const ecommerceUtilsRoute = require('./ecommerce.utils.route');

const router = Router();

//API URL: (host):(port)/api/demo
router.use('/demo', demoRoute);

//API URL: (host):(port)/api/maintenance
router.use('/maintenance', maintenanceRoute);

//API URL: (host):(port)/api/ecommerce
router.use('/ecommerce', ecommerceProductsRoute);
router.use('/ecommerce', ecommerceCartRoute);
router.use('/ecommerce', ecommerceOrdersRoute);
router.use('/ecommerce', ecommerceUtilsRoute);

// Add routes declaration here:

module.exports = router;