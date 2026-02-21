// ============================================================
// PROVEEDOR IA — Google Gemini
// ============================================================
// Implementa la interfaz común: generateResponse(userMessage, contactName)
// ============================================================

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getSystemPrompt } = require('../systemPrompt');
const logger = require('../../../utils/logger');

class GeminiProvider {
  /**
   * @param {string} apiKey - GEMINI_API_KEY
   * @param {string} model - GEMINI_MODEL
   */
  constructor(apiKey, model) {
    this.modelName = model;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_ONLY_HIGH',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_ONLY_HIGH',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_ONLY_HIGH',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_ONLY_HIGH',
        },
      ],
    });

    logger.info(`GeminiProvider inicializado con modelo: ${this.modelName}`);
  }

  /**
   * Genera una respuesta a partir del mensaje del usuario.
   * @param {string} userMessage - Texto del mensaje del usuario
   * @param {string} contactName - Nombre del contacto
   * @returns {Promise<string>} Respuesta generada
   */
  async generateResponse(userMessage, contactName) {
    try {
      const systemPrompt = getSystemPrompt(contactName);

      const chat = this.model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: `INSTRUCCIONES DEL SISTEMA:\n${systemPrompt}` }],
          },
          {
            role: 'model',
            parts: [
              {
                text: '¡Entendido! Soy el asistente virtual de FarmaBot. Estoy listo para ayudar a los clientes con consultas de productos, información general de medicamentos, pedidos a domicilio y preguntas frecuentes. Seguiré todas las reglas de seguridad sanitaria y responderé de forma breve y amable.',
              },
            ],
          },
        ],
      });

      const result = await chat.sendMessage(userMessage);
      const response = result.response;
      const text = response.text();

      if (!text || text.trim().length === 0) {
        throw new Error('Gemini devolvió respuesta vacía');
      }

      logger.info(`Gemini respondió (${text.length} chars)`);
      return text.trim();
    } catch (err) {
      logger.error(`GeminiProvider error: ${err.message}`);
      throw err;
    }
  }
}

module.exports = GeminiProvider;