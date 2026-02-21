const axios = require('axios');
const config = require('../config/env');
const logger = require('../utils/logger');
const { uploadPrescriptionToS3 } = require('./s3Service');
const { searchProducts } = require('./inventory');
const { PRESCRIPTION_PROMPT } = require('./ai/prescriptionPrompt');

let _provider = null;
function getVisionProvider() {
  if (_provider) return _provider;
  if (config.AI_PROVIDER === 'openai' && config.OPENAI_API_KEY) {
    const OpenAIProvider = require('./ai/providers/openaiProvider');
    _provider = new OpenAIProvider(config.OPENAI_API_KEY, config.OPENAI_MODEL);
  } else if (config.GEMINI_API_KEY) {
    const GeminiProvider = require('./ai/providers/geminiProvider');
    _provider = new GeminiProvider(config.GEMINI_API_KEY, config.GEMINI_MODEL);
  }
  return _provider;
}

async function downloadWhatsAppMedia(mediaId) {
  const mediaInfo = await axios.get(
    `https://graph.facebook.com/${config.WHATSAPP_API_VERSION}/${mediaId}`,
    {
      headers: { Authorization: `Bearer ${config.WHATSAPP_TOKEN}` },
      timeout: 10000,
    }
  );

  const { url, mime_type: mimeType = 'image/jpeg' } = mediaInfo.data;

  const imageData = await axios.get(url, {
    headers: { Authorization: `Bearer ${config.WHATSAPP_TOKEN}` },
    responseType: 'arraybuffer',
    timeout: 30000,
  });

  return { buffer: Buffer.from(imageData.data), mimeType };
}

function parseAIResponse(rawText) {
  try {
    const clean = rawText
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/gi, '')
      .trim();
    return JSON.parse(clean);
  } catch (err) {
    logger.error('Error parseando respuesta IA:', rawText);
    return null;
  }
}

async function matchWithInventory(medicines) {
  const results = [];
  for (const med of medicines) {
    try {
      const matches = await searchProducts(med.name);
      results.push({
        ...med,
        inventoryMatch: matches.length > 0 ? matches[0] : null,
      });
    } catch (err) {
      results.push({ ...med, inventoryMatch: null });
    }
  }
  return results;
}

function formatPrescriptionResponse(analysis, medicinesWithInventory) {
  let text = `🔬 *ANÁLISIS DE FÓRMULA MÉDICA*\n━━━━━━━━━━━━━━━━━━\n\n`;

  if (analysis.patientName) text += `👤 Paciente: ${analysis.patientName}\n`;
  if (analysis.doctorName)  text += `👨‍⚕️ Médico: ${analysis.doctorName}\n`;
  if (analysis.date)        text += `📅 Fecha: ${analysis.date}\n`;
  if (analysis.patientName || analysis.doctorName) text += '\n';

  text += `💊 *Medicamentos detectados:*\n\n`;

  let hasPrescriptionRequired = false;
  let hasAvailableProducts = false;

  medicinesWithInventory.forEach((med, i) => {
    const prescIcon = med.requiresPrescription ? '🔴' : '🟢';
    text += `*${i + 1}. ${prescIcon} ${med.name}*\n`;
    if (med.dosage)    text += `   📏 Dosis: ${med.dosage}\n`;
    if (med.frequency) text += `   🕐 Frecuencia: ${med.frequency}\n`;
    if (med.duration)  text += `   📆 Duración: ${med.duration}\n`;

    if (med.inventoryMatch) {
      const inv = med.inventoryMatch;
      const stockIcon = inv.available ? '✅' : '❌';
      const price = inv.price > 0 ? `$${inv.price.toFixed(2)}` : 'Consultar';
      text += `   🏪 En farmacia: ${stockIcon} ${inv.name} — ${price}\n`;
      if (inv.available) hasAvailableProducts = true;
    } else {
      text += `   🏪 No encontrado en inventario\n`;
    }

    if (med.requiresPrescription) hasPrescriptionRequired = true;
    text += '\n';
  });

  if (analysis.notes) text += `📝 *Notas:* ${analysis.notes}\n\n`;

  text += `━━━━━━━━━━━━━━━━━━\n`;

  if (hasPrescriptionRequired) {
    text += `🔴 *Requiere validación de receta*\n`;
    text += `Escribe *6* para hablar con un asesor.\n`;
  } else if (hasAvailableProducts) {
    text += `🟢 *Productos disponibles sin receta*\n`;
    text += `Escribe *4* para hacer tu pedido.\n`;
  } else {
    text += `Escribe *6* para consultar con un asesor.\n`;
  }

  if (analysis.confidence === 'low') {
    text += `\n⚠️ _Imagen de baja calidad. Si algo es incorrecto envía una foto más clara._`;
  }

  text += `\n\nEscribe *menu* para volver al inicio.`;
  return text;
}

async function processPrescriptionImage(mediaId, userId) {
  try {
    logger.info(`Procesando fórmula | usuario: ${userId} | mediaId: ${mediaId}`);

    const { buffer, mimeType } = await downloadWhatsAppMedia(mediaId);
    logger.info(`Imagen descargada: ${buffer.length} bytes (${mimeType})`);

    const imageUrl = await uploadPrescriptionToS3(buffer, mimeType, userId);
    logger.info(`Imagen guardada en S3: ${imageUrl}`);

    const provider = getVisionProvider();
    if (!provider) throw new Error('No hay proveedor IA configurado');

    const rawResponse = await provider.analyzeImage(buffer, mimeType, PRESCRIPTION_PROMPT);
    const analysis = parseAIResponse(rawResponse);

    if (!analysis) throw new Error('La IA no devolvió JSON válido');

    if (!analysis.valid) {
      return (
        `⚠️ *No se pudo analizar la imagen*\n\n` +
        `Motivo: ${analysis.reason || 'no reconocida como receta médica'}\n\n` +
        `Por favor envía una foto clara de la receta, sin reflejos ni sombras.\n\n` +
        `O escribe *6* para hablar con un asesor.`
      );
    }

    const medicinesWithInventory = await matchWithInventory(analysis.medicines || []);
    return formatPrescriptionResponse(analysis, medicinesWithInventory);

  } catch (err) {
    logger.error(`Error procesando fórmula médica: ${err.message}`);
    return (
      `😔 Tuve un problema analizando tu fórmula.\n\n` +
      `Intenta enviar una foto más clara.\n` +
      `O escribe *6* para hablar con un asesor.`
    );
  }
}

module.exports = { processPrescriptionImage };