// ============================================================
// SERVICIO — WhatsApp Cloud API
// ============================================================

const axios = require('axios');
const config = require('../config/env');
const logger = require('../utils/logger');

const BASE_URL = `https://graph.facebook.com/${config.WHATSAPP_API_VERSION}/${config.PHONE_NUMBER_ID}/messages`;

const headers = {
  Authorization: `Bearer ${config.WHATSAPP_TOKEN}`,
  'Content-Type': 'application/json',
};

// -----------------------------------------------------------
// Enviar mensaje de texto
// -----------------------------------------------------------
async function sendTextMessage(to, text) {
  try {
    await axios.post(
      BASE_URL,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: {
          preview_url: false,
          body: text,
        },
      },
      { headers, timeout: 10000 }
    );

    logger.info(`Mensaje enviado a ${to} (${text.length} chars)`);
  } catch (err) {
    const errorData = err.response ? err.response.data : err.message;
    logger.error(`Error enviando mensaje a ${to}:`, JSON.stringify(errorData));
    throw err;
  }
}

// -----------------------------------------------------------
// Marcar mensaje como leído (blue checkmarks)
// -----------------------------------------------------------
async function markAsRead(messageId) {
  try {
    await axios.post(
      BASE_URL,
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      },
      { headers, timeout: 5000 }
    );
  } catch (err) {
    // No es crítico — solo log silencioso
    logger.warn(`No se pudo marcar como leído ${messageId}`);
  }
}

module.exports = { sendTextMessage, markAsRead };