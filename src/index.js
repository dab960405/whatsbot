// ============================================================
// PUNTO DE ENTRADA — WhatsApp Pharmacy Bot
// ============================================================

const app = require('./app');                  // ← CORREGIDO (antes: './src/app')
const config = require('./config/env');         // ← CORREGIDO (antes: './src/config/env')
const logger = require('./utils/logger');       // ← CORREGIDO (antes: './src/utils/logger')

// -----------------------------------------------------------
// Validación de variables críticas al arranque
// -----------------------------------------------------------
function validateEnvironment() {
  const required = [
    'WEBHOOK_VERIFY_TOKEN',
    'WHATSAPP_TOKEN',
    'PHONE_NUMBER_ID',
  ];

  const missing = required.filter((key) => !config[key]);

  if (missing.length > 0) {
    logger.error(`Variables de entorno faltantes: ${missing.join(', ')}`);
    logger.error('El servidor arrancará pero el bot NO funcionará correctamente.');
  }

  const aiReady =
    (config.AI_PROVIDER === 'gemini' && config.GEMINI_API_KEY) ||
    (config.AI_PROVIDER === 'openai' && config.OPENAI_API_KEY);

  if (!aiReady) {
    logger.warn(
      `AI_PROVIDER="${config.AI_PROVIDER}" pero no se encontró la API key correspondiente. ` +
      'Se usarán respuestas genéricas de fallback.'
    );
  }
}

// -----------------------------------------------------------
// Manejo de errores no capturados
// -----------------------------------------------------------
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err.message);
  logger.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

// -----------------------------------------------------------
// Arranque del servidor
// -----------------------------------------------------------
validateEnvironment();

const PORT = config.PORT;

app.listen(PORT, () => {
  logger.info('==============================================');
  logger.info('  WhatsApp Pharmacy Bot — Servidor iniciado');
  logger.info('==============================================');
  logger.info(`  Puerto:       ${PORT}`);
  logger.info(`  Entorno:      ${config.NODE_ENV}`);
  logger.info(`  AI Provider:  ${config.AI_PROVIDER}`);
  logger.info(`  WA API:       ${config.WHATSAPP_API_VERSION}`);
  logger.info('==============================================');
});