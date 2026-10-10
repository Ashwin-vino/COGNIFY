const app = require('./app');
const config = require('./config/env');

const server = app.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`   COGNIFY BACKEND RUNNING ON http://localhost:${config.port}`);
  console.log(`   Model: ${config.geminiModel}`);
  console.log(`   Health Check: http://localhost:${config.port}/api/health`);
  console.log(`=======================================================`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Cognify] SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('[Cognify] HTTP server closed');
  });
});

module.exports = server;
