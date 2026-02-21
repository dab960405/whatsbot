// ============================================================
// CONTROLLER — Webhook de WhatsApp
// ============================================================

const config = require('../config/env');
const logger = require('../utils/logger');
const { processIncomingMessage } = require('../services/messageProcessor');

// -----------------------------------------------------------
// GET /webhook — Verificación del webhook
// -----------------------------------------------------------
function verify(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.WEBHOOK_VERIFY_TOKEN) {
    logger.info('Webhook verificado correctamente ✓');
    return res.status(200).send(challenge);
  }

  logger.warn('Verificación de webhook fallida — token inválido');
  return res.sendStatus(403);
}

// -----------------------------------------------------------
// POST /webhook — Recepción de mensajes
// -----------------------------------------------------------
function receive(req, res) {
  // SIEMPRE responder 200 inmediatamente (requerimiento de Meta)
  res.status(200).send('EVENT_RECEIVED');

  // Procesar el payload de forma asíncrona
  try {
    const body = req.body;

    // Validar estructura básica
    if (body.object !== 'whatsapp_business_account') {
      return;
    }

    const entries = body.entry;
    if (!Array.isArray(entries)) return;

    for (const entry of entries) {
      const changes = entry.changes;
      if (!Array.isArray(changes)) continue;

      for (const change of changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        if (!value) continue;

        // Ignorar actualizaciones de estado (delivered, read, etc.)
        if (value.statuses) continue;

        const messages = value.messages;
        if (!Array.isArray(messages)) continue;

        const contacts = value.contacts || [];

        for (const message of messages) {
          const contact = contacts.find(
            (c) => c.wa_id === message.from
          );

          const messageData = {
            messageId: message.id,
            from: message.from,
            timestamp: message.timestamp,
            type: message.type,
            text: message.text ? message.text.body : null,
            contactName:
              contact && contact.profile
                ? contact.profile.name
                : 'Cliente',
          };

          // Procesar cada mensaje de forma asíncrona sin bloquear
          processIncomingMessage(messageData).catch((err) => {
            logger.error(
              `Error procesando mensaje ${messageData.messageId}:`,
              err.message
            );
          });
        }
      }
    }
  } catch (err) {
    logger.error('Error extrayendo mensajes del webhook:', err.message);
  }
}

module.exports = { verify, receive };