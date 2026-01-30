const express = require('express');
require('./db.connfig'); // your mongoose connection
const helmet = require('helmet');
const cors = require('cors');
const Joi = require('joi');
const path = require ('path')

const app = express();

// CORS middleware - allow frontend origin
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:3000'], // Vite dev server ports
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
}));
app.options('*', cors());

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

// Custom Content Security Policy to allow images from backend
const { contentSecurityPolicy } = require('helmet');
app.use(
  contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'http://localhost:9005', 'http://127.0.0.1:9005'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
      connectSrc: ["'self'", 'http://localhost:9005', 'http://127.0.0.1:9005'],
      fontSrc: ["'self'", 'https:', 'data:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: [],
    },
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving
app.use('/public', express.static('public'));

// Routes
const mainRouter = require('./routing.config');
app.use(mainRouter);

// Health check route (optional)
app.get('/health', (req, res) => {
  res.status(200).json({ message: "Server is running" });
});

// Error handling middleware
app.use((error, req, res, next) => {
  let statusCode = error.status || 500;
  let message = error.message || "Internal Server Error";
  let data = error.data || null;

  if (error instanceof Joi.ValidationError) {
    statusCode = 422;
    message = "Validation Failed";
    data = {};
    error.details.forEach(detail => {
      data[detail.context.label] = detail.message;
    });
  }

  if (statusCode === 11000) { // Mongo duplicate key error
    statusCode = 400;
    data = {};
    const fields = Object.keys(error.keyPattern);
    fields.forEach(field => {
      data[field] = `${field} should be unique`;
    });
    message = "Validation Error";
  }

  res.status(statusCode).json({
    result: data,
    message,
    meta: null
  });
});

module.exports = app;
