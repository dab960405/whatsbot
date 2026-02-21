// ============================================================
// MIDDLEWARE — Validación de firma Meta (X-Hub-Signature-256)
// ============================================================

const crypto = require('crypto');
const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * Valida la firma HMAC-SHA256 enviada por Meta en el header
 * X-Hub-Signature-256. Si APP_SECRET no está configurado,
 * se salta la validación (para no romper configuraciones existentes).
 */
function signatureValidator(req, res, next) {
  // Si no hay APP_SECRET, saltar validación
  if (!config.APP_SECRET) {
    return next();
  }

  const signature = req.headers['x-hub-signature-256'];

  // Si Meta no envió firma, rechazar
  if (!signature) {
    logger.warn('Webhook request sin header X-Hub-Signature-256');
    return res.sendStatus(401);
  }

  // Calcular firma esperada
  const expectedSignature =
    'sha256=' +
    crypto
      .createHmac('sha256', config.APP_SECRET)
      .update(req.rawBody || '')
      .digest('hex');

  // Comparar con timing-safe (prevenir timing attacks)
  const sigBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (sigBuffer.length !== expectedBuffer.length) {
    logger.warn('Firma Meta inválida (longitud diferente)');
    return res.sendStatus(401);
  }

  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    logger.warn('Firma Meta inválida (no coincide)');
    return res.sendStatus(401);
  }

  next();
}

module.exports = signatureValidator;