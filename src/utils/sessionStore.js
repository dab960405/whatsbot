// ============================================================
// UTILIDAD — Almacén de sesiones en memoria
// ============================================================
// Mantiene el estado conversacional de cada usuario.
// Stateless entre reinicios (aceptable para MVP).
// Cada sesión tiene TTL para liberar memoria.
// ============================================================

const logger = require('./logger');

// Almacén: phoneNumber -> sessionData
const sessions = new Map();

// TTL: 30 minutos de inactividad
const SESSION_TTL_MS = 30 * 60 * 1000;

// Limpieza cada 5 minutos
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Estados posibles de la conversación
 */
const STATES = {
  WELCOME: 'WELCOME',
  MAIN_MENU: 'MAIN_MENU',
  SEARCH_PRODUCT: 'SEARCH_PRODUCT',
  PRODUCT_DETAIL: 'PRODUCT_DETAIL',
  ORDER_PRODUCT: 'ORDER_PRODUCT',
  ORDER_QUANTITY: 'ORDER_QUANTITY',
  ORDER_ADDRESS: 'ORDER_ADDRESS',
  ORDER_NAME: 'ORDER_NAME',
  ORDER_PHONE: 'ORDER_PHONE',
  ORDER_CONFIRM: 'ORDER_CONFIRM',
  FAQ: 'FAQ',
  AI_CHAT: 'AI_CHAT',
  HUMAN_ESCALATION: 'HUMAN_ESCALATION',
};

/**
 * Obtiene o crea la sesión de un usuario.
 * @param {string} phoneNumber
 * @returns {object} sessionData
 */
function getSession(phoneNumber) {
  let session = sessions.get(phoneNumber);

  if (!session) {
    session = {
      state: STATES.WELCOME,
      lastActivity: Date.now(),
      data: {},
    };
    sessions.set(phoneNumber, session);
    logger.debug(`Nueva sesión creada para ${phoneNumber}`);
  }

  session.lastActivity = Date.now();
  return session;
}

/**
 * Actualiza el estado de la sesión.
 * @param {string} phoneNumber
 * @param {string} state
 * @param {object} data - Datos adicionales a merge
 */
function setState(phoneNumber, state, data = {}) {
  const session = getSession(phoneNumber);
  session.state = state;
  session.data = { ...session.data, ...data };
  session.lastActivity = Date.now();
  logger.debug(`Sesión ${phoneNumber}: estado → ${state}`);
}

/**
 * Reinicia la sesión al menú principal.
 * @param {string} phoneNumber
 */
function resetSession(phoneNumber) {
  sessions.set(phoneNumber, {
    state: STATES.MAIN_MENU,
    lastActivity: Date.now(),
    data: {},
  });
}

/**
 * Limpia sesiones expiradas.
 */
function cleanup() {
  const now = Date.now();
  let cleaned = 0;

  for (const [phone, session] of sessions.entries()) {
    if (now - session.lastActivity > SESSION_TTL_MS) {
      sessions.delete(phone);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug(`Sesiones limpiadas: ${cleaned}. Activas: ${sessions.size}`);
  }
}

// Limpieza periódica
const cleanupInterval = setInterval(cleanup, CLEANUP_INTERVAL_MS);
if (cleanupInterval.unref) cleanupInterval.unref();

module.exports = {
  STATES,
  getSession,
  setState,
  resetSession,
};