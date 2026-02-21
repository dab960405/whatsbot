// ============================================================
// UTILIDAD — Logger simple y estructurado
// ============================================================
// En producción en Render, stdout/stderr son capturados
// automáticamente por los logs del servicio.
// ============================================================

const config = require('../config/env');

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// En producción solo error, warn e info. En dev incluir debug.
const currentLevel =
  config.NODE_ENV === 'production' ? LOG_LEVELS.info : LOG_LEVELS.debug;

function formatTimestamp() {
  return new Date().toISOString();
}

function formatMessage(level, args) {
  const timestamp = formatTimestamp();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  return [prefix, ...args];
}

const logger = {
  error: (...args) => {
    if (currentLevel >= LOG_LEVELS.error) {
      console.error(...formatMessage('error', args));
    }
  },

  warn: (...args) => {
    if (currentLevel >= LOG_LEVELS.warn) {
      console.warn(...formatMessage('warn', args));
    }
  },

  info: (...args) => {
    if (currentLevel >= LOG_LEVELS.info) {
      console.log(...formatMessage('info', args));
    }
  },

  debug: (...args) => {
    if (currentLevel >= LOG_LEVELS.debug) {
      console.log(...formatMessage('debug', args));
    }
  },
};

module.exports = logger;