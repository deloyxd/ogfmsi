/* 👇 Default: Do not modify 👇 */

require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');

const router = require('./routes/route');
const corsMiddleware = require('./middleware/cross-origin-middleware');
const app = express();
const PORT = process.env.PORT || 5501;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.use(bodyParser.json());
app.use(corsMiddleware);

app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.path}`);
  next();
});

/* 👆 Default: Do not modify 👆 */


//API URL: (host):(port)/api
app.use('/api',router);

//Fall back Middleware, eto irereturn pag may nag access ng api route na hindi pa existing 
// app.use('*', (req, res) => {
//   res.status(404).json({error: 'Not Found'});
// });
