// ============================================================
// CONFIGURACIÓN — Variables de entorno
// ============================================================
// Lee EXACTAMENTE las variables existentes en Render.
// Las nuevas variables de Google Sheets son OPCIONALES.
// Si no existen, el bot funciona sin inventario.
// ============================================================

module.exports = {
  // Servidor
  PORT: parseInt(process.env.PORT, 10) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'production',

  // WhatsApp Cloud API
  WEBHOOK_VERIFY_TOKEN: process.env.WEBHOOK_VERIFY_TOKEN,
  WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN,
  PHONE_NUMBER_ID: process.env.PHONE_NUMBER_ID,
  WHATSAPP_API_VERSION: process.env.WHATSAPP_API_VERSION || 'v21.0',
  APP_SECRET: process.env.APP_SECRET,

  // IA — Proveedor intercambiable
  AI_PROVIDER: (process.env.AI_PROVIDER || 'gemini').toLowerCase().trim(),

  // Gemini
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-1.5-flash',

  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',

  // Rate Limiting
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,

  // Google Sheets — Inventario (OPCIONALES)
  // GOOGLE_SHEETS_ID: ID de la hoja de cálculo (extraído de la URL)
  // GOOGLE_SHEETS_TAB: Nombre de la pestaña (default: "Inventario")
  // GOOGLE_SHEETS_API_KEY: API Key de Google (para acceso público)
  GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID || '',
  GOOGLE_SHEETS_TAB: process.env.GOOGLE_SHEETS_TAB || 'Inventario',
  GOOGLE_SHEETS_API_KEY: process.env.GOOGLE_SHEETS_API_KEY || '',

  // Cache de inventario en segundos (default: 5 minutos)
  INVENTORY_CACHE_TTL: parseInt(process.env.INVENTORY_CACHE_TTL, 10) || 300,
};