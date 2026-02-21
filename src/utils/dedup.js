// ============================================================
// UTILIDAD — Deduplicación de mensajes en memoria
// ============================================================
// WhatsApp Cloud API puede enviar el mismo webhook múltiples
// veces (redelivery). Este módulo previene procesamiento
// duplicado usando una caché en memoria con TTL.
//
// Stateless entre reinicios (aceptable para este caso).
// ============================================================

const logger = require('./logger');

// Almacén en memoria: messageId -> timestamp
const processedMessages = new Map();

// TTL: 5 minutos (suficiente para evitar duplicados de Meta)
const TTL_MS = 5 * 60 * 1000;

// Limpieza periódica cada 2 minutos
const CLEANUP_INTERVAL_MS = 2 * 60 * 1000;

/**
 * Verifica si un messageId ya fue procesado.
 * Si es nuevo, lo registra y retorna false.
 * Si ya existe, retorna true (es duplicado).
 *
 * @param {string} messageId - ID del mensaje de WhatsApp
 * @returns {boolean} true si es duplicado
 */
function isDuplicate(messageId) {
  if (!messageId) return false;

  if (processedMessages.has(messageId)) {
    return true;
  }

  processedMessages.set(messageId, Date.now());
  return false;
}

/**
 * Limpia entradas expiradas del mapa de deduplicación.
 */
function cleanup() {
  const now = Date.now();
  let cleaned = 0;

  for (const [id, timestamp] of processedMessages.entries()) {
    if (now - timestamp > TTL_MS) {
      processedMessages.delete(id);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug(`Dedup: limpiadas ${cleaned} entradas expiradas. Activas: ${processedMessages.size}`);
  }
}

// Iniciar limpieza periódica
const cleanupInterval = setInterval(cleanup, CLEANUP_INTERVAL_MS);

// Evitar que el intervalo mantenga vivo el proceso
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

module.exports = { isDuplicate };