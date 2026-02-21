// ============================================================
// SERVICIO — Procesador de mensajes entrantes
// ============================================================

const { sendTextMessage, markAsRead } = require('./whatsappService');
const { getAIResponse } = require('./ai');
const logger = require('../utils/logger');
const dedup = require('../utils/dedup');

// -----------------------------------------------------------
// Constantes
// -----------------------------------------------------------
const MAX_INPUT_LENGTH = 500;

const FALLBACK_MESSAGE =
  'Disculpa, estoy teniendo dificultades técnicas en este momento 😅\n\n' +
  'Por favor intenta de nuevo en unos momentos o escribe *"asesor"* para hablar con una persona.';

const NON_TEXT_MESSAGE =
  'Por el momento solo puedo leer mensajes de texto 📝\n\n' +
  '¿En qué puedo ayudarte? Escríbeme tu consulta.';

// -----------------------------------------------------------
// Procesar mensaje entrante
// -----------------------------------------------------------
async function processIncomingMessage(messageData) {
  const { messageId, from, type, text, contactName } = messageData;

  // Deduplicación — evitar procesar el mismo mensaje dos veces
  if (dedup.isDuplicate(messageId)) {
    logger.warn(`Mensaje duplicado ignorado: ${messageId}`);
    return;
  }

  logger.info(
    `Mensaje recibido de ${from} (${contactName}) | Tipo: ${type} | ID: ${messageId}`
  );

  // Marcar como leído inmediatamente
  markAsRead(messageId).catch(() => {});

  // Si no es texto, responder con mensaje informativo
  if (type !== 'text' || !text) {
    try {
      await sendTextMessage(from, NON_TEXT_MESSAGE);
    } catch (err) {
      logger.error('Error enviando respuesta non-text:', err.message);
    }
    return;
  }

  // Sanitizar y truncar el texto del usuario
  const sanitizedText = text.trim().substring(0, MAX_INPUT_LENGTH);

  if (sanitizedText.length === 0) {
    try {
      await sendTextMessage(
        from,
        '¡Hola! 👋 Soy el asistente de tu farmacia. ¿En qué puedo ayudarte?'
      );
    } catch (err) {
      logger.error('Error enviando saludo:', err.message);
    }
    return;
  }

  // Generar respuesta con IA
  try {
    const aiResponse = await getAIResponse(sanitizedText, contactName);
    await sendTextMessage(from, aiResponse);
  } catch (err) {
    logger.error('Error en pipeline de respuesta:', err.message);

    // Enviar fallback amigable
    try {
      await sendTextMessage(from, FALLBACK_MESSAGE);
    } catch (sendErr) {
      logger.error('Error enviando fallback:', sendErr.message);
    }
  }
}

module.exports = { processIncomingMessage };