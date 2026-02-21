// ============================================================
// PROVEEDOR IA — OpenAI (GPT)
// ============================================================
// Implementa la interfaz común: generateResponse(userMessage, contactName)
// ============================================================

const OpenAI = require('openai');
const { getSystemPrompt } = require('../systemPrompt');
const logger = require('../../../utils/logger');

class OpenAIProvider {
  /**
   * @param {string} apiKey - OPENAI_API_KEY
   * @param {string} model - OPENAI_MODEL
   */
  constructor(apiKey, model) {
    this.modelName = model;
    this.client = new OpenAI({ apiKey });

    logger.info(`OpenAIProvider inicializado con modelo: ${this.modelName}`);
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

      const completion = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
      });

      const text =
        completion.choices &&
        completion.choices[0] &&
        completion.choices[0].message &&
        completion.choices[0].message.content;

      if (!text || text.trim().length === 0) {
        throw new Error('OpenAI devolvió respuesta vacía');
      }

      logger.info(`OpenAI respondió (${text.length} chars)`);
      return text.trim();
    } catch (err) {
      logger.error(`OpenAIProvider error: ${err.message}`);
      throw err;
    }
  }
}

module.exports = OpenAIProvider;