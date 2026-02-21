// ============================================================
// MIDDLEWARE — Manejador global de errores
// ============================================================

const logger = require('../utils/logger');

function errorHandler(err, _req, res, _next) {
  logger.error('Error no manejado:', err.message);
  logger.error(err.stack);

  res.status(500).json({
    error: 'Error interno del servidor',
  });
}

module.exports = errorHandler;