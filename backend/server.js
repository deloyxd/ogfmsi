/* 👇 Default: Do not modify 👇 */

require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const router = require('./routes/route');
const corsMiddleware = require('./middleware/cross-origin-middleware');
const { withRequestContext } = require('./utils/request-context');
const app = express();
const PORT = process.env.PORT || 5501;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// tinaasan ko lang limit ng pagkuha ng picture ayaw kasi pumasok sa limit ng server
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(corsMiddleware);
// Per-request context for DB timing aggregation (must be before routes)
app.use(withRequestContext());

app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.path}`);
  next();
});

/* 👆 Default: Do not modify 👆 */

const compression = require('compression');
const serverTiming = require('./middleware/server-timing-middleware');

// Enable compression and Server-Timing before routes
app.use(compression());
app.use(serverTiming());

// Serve static files from src/html directory
app.use(express.static(path.join(__dirname, '../src/html')));

//API URL: (host):(port)/api

app.use('/api',router);

// Specific routes for short paths
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../src/html/_admin_main.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../src/html/customer_login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, '../src/html/customer_dashboard.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, '../src/html/apt_about_us.html')));
app.get('/privacy', (req, res) => res.sendFile(path.join(__dirname, '../src/html/apt_privacy_policy.html')));
app.get('/terms', (req, res) => res.sendFile(path.join(__dirname, '../src/html/apt_terms_of_service.html')));


//Fall back Middleware, eto irereturn pag may nag access ng api route na hindi pa existing
// app.use('*', (req, res) => {
//   res.status(404).json({error: 'Not Found'});
// });
