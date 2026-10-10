const app = require('./cognify/backend/app');

// Vercel serverless handler for repository root deployments
module.exports = (req, res) => {
  return app(req, res);
};
