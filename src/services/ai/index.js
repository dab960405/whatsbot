// ============================================================
// SERVICIO IA — Factory / Adaptador (Proveedor Intercambiable)
// ============================================================
//
// Cambiar de proveedor de IA es tan simple como modificar
// la variable de entorno AI_PROVIDER (gemini | openai).
//
// Arquitectura:
// - Interfaz común: generateResponse(userMessage, contactName)
// - Un solo proveedor activo a la vez
// - Sin dependencias cruzadas entre proveedores
// - Fácil agregar nuevos proveedores en el futuro
//
// ============================================================

const config = require('../../config/env');
const logger = require('../../utils/logger');
const GeminiProvider = require('./providers/geminiProvider');
const OpenAIProvider = require('./providers/openaiProvider');

// -----------------------------------------------------------
// Mensaje de fallback cuando la IA no está disponible
// -----------------------------------------------------------
const AI_UNAVAILABLE_MESSAGE =
  '¡Hola! 👋 Soy el asistente de tu farmacia.\n\n' +
  'En este momento no puedo procesar tu consulta automáticamente. ' +
  'Por favor escribe *"asesor"* y te comunicaremos con alguien del equipo.\n\n' +
  '🕐 Horario: L-S 8:00-21:00 | D 9:00-14:00';

// -----------------------------------------------------------
// Crear instancia del proveedor según AI_PROVIDER
// -----------------------------------------------------------
let providerInstance = null;

function getProvider() {
  if (providerInstance) return providerInstance;

  switch (config.AI_PROVIDER) {
    case 'openai':
      if (!config.OPENAI_API_KEY) {
        logger.warn('OPENAI_API_KEY no configurada. IA no disponible.');
        return null;
      }
      providerInstance = new OpenAIProvider(
        config.OPENAI_API_KEY,
        config.OPENAI_MODEL
      );
      logger.info(`Proveedor IA inicializado: OpenAI (${config.OPENAI_MODEL})`);
      break;

    case 'gemini':
    default:
      if (!config.GEMINI_API_KEY) {
        logger.warn('GEMINI_API_KEY no configurada. IA no disponible.');
        return null;
      }
      providerInstance = new GeminiProvider(
        config.GEMINI_API_KEY,
        config.GEMINI_MODEL
      );
      logger.info(`Proveedor IA inicializado: Gemini (${config.GEMINI_MODEL})`);
      break;
  }

  return providerInstance;
}

// -----------------------------------------------------------
// Función pública: obtener respuesta de IA
// -----------------------------------------------------------
async function getAIResponse(userMessage, contactName) {
  const provider = getProvider();

  // Si no hay proveedor configurado, devolver fallback
  if (!provider) {
    logger.warn('Sin proveedor IA activo — devolviendo fallback');
    return AI_UNAVAILABLE_MESSAGE;
  }

  try {
    const response = await provider.generateResponse(userMessage, contactName);

    // Validar que la respuesta sea válida
    if (!response || typeof response !== 'string' || response.trim().length === 0) {
      logger.warn('IA devolvió respuesta vacía — devolviendo fallback');
      return AI_UNAVAILABLE_MESSAGE;
    }

    // Truncar si es demasiado larga para WhatsApp (límite ~4096)
    const maxLength = 4000;
    if (response.length > maxLength) {
      return response.substring(0, maxLength) + '\n\n...✂️ (mensaje recortado)';
    }

    return response.trim();
  } catch (err) {
    logger.error(`Error en proveedor IA (${config.AI_PROVIDER}):`, err.message);
    return AI_UNAVAILABLE_MESSAGE;
  }
}

module.exports = { getAIResponse };