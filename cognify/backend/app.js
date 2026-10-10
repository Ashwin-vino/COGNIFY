const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/env');

const healthRoutes = require('./routes/health');
const workspacesRoutes = require('./routes/workspaces');
const subjectsRoutes = require('./routes/subjects');
const syllabusRoutes = require('./routes/syllabus');
const documentsRoutes = require('./routes/documents');
const chatRoutes = require('./routes/chat');
const studyRoutes = require('./routes/study');
const studySetsRoutes = require('./routes/studySets');
const quizRoutes = require('./routes/quiz');
const progressRoutes = require('./routes/progress');

const app = express();

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow localhost and production client domains
      callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Endpoints
app.use('/api', healthRoutes);
app.use('/api/workspaces', workspacesRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api', syllabusRoutes);
app.use('/api', documentsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/study', studyRoutes);
app.use('/api', studySetsRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api', progressRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Cognify API Error]', err.message);

  const statusCode = err.status || err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_ERROR';

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: err.message || 'An unexpected server error occurred.',
    },
  });
});

module.exports = app;
