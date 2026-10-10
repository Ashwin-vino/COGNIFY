const app = require('../backend/app');

// Vercel serverless handler
module.exports = (req, res) => {
  return app(req, res);
};
