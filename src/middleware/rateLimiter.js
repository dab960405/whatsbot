// ============================================================
// MIDDLEWARE — Rate Limiter
// ============================================================

const rateLimit = require('express-rate-limit');
const config = require('../config/env');

const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
  },
  // No aplicar rate limit si viene de health checks
  skip: (req) => req.path === '/health' || req.path === '/',
});

module.exports = limiter;