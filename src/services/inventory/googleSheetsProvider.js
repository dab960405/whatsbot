// ============================================================
// INVENTARIO — Proveedor Google Sheets
// ============================================================
// Lee el inventario desde una hoja de Google Sheets pública
// usando la Google Sheets API v4 (solo lectura, via API Key).
//
// FORMATO ESPERADO DE LA HOJA:
// Fila 1 (encabezados): Producto | Precio | Disponible | Presentación | Categoría
// Fila 2+: datos
//
// Ejemplo:
// | Producto        | Precio | Disponible | Presentación      | Categoría    |
// |-----------------|--------|------------|-------------------|--------------|
// | Paracetamol     | 35.00  | Sí         | Caja 20 tabletas  | Dolor        |
// | Ibuprofeno 400  | 45.50  | Sí         | Caja 10 tabletas  | Dolor        |
// | Omeprazol 20mg  | 89.00  | No         | Caja 14 cápsulas  | Gastro       |
// ============================================================

const axios = require('axios');
const config = require('../../config/env');
const logger = require('../../utils/logger');

// Mapeo de columnas esperadas (case-insensitive)
const COLUMN_MAP = {
  producto: 'name',
  nombre: 'name',
  product: 'name',
  precio: 'price',
  price: 'price',
  costo: 'price',
  disponible: 'available',
  disponibilidad: 'available',
  available: 'available',
  stock: 'available',
  presentacion: 'presentation',
  presentación: 'presentation',
  descripcion: 'presentation',
  descripción: 'presentation',
  description: 'presentation',
  categoria: 'category',
  categoría: 'category',
  category: 'category',
  tipo: 'category',
};

/**
 * Normaliza texto para comparación.
 */
function normalize(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Determina si un valor indica disponibilidad positiva.
 */
function parseAvailability(value) {
  if (!value) return false;
  const normalized = normalize(value);
  const positive = ['si', 'sí', 'yes', 'disponible', 'true', '1', 'en stock', 'hay'];
  return positive.includes(normalized) || parseInt(value, 10) > 0;
}

/**
 * Parsea el precio a número.
 */
function parsePrice(value) {
  if (!value) return 0;
  const cleaned = value.toString().replace(/[^0-9.,]/g, '').replace(',', '.');
  const price = parseFloat(cleaned);
  return isNaN(price) ? 0 : price;
}

/**
 * Descarga y parsea los datos de Google Sheets.
 * @returns {Promise<Array>} Lista de productos
 */
async function fetchFromGoogleSheets() {
  if (!config.GOOGLE_SHEETS_ID || !config.GOOGLE_SHEETS_API_KEY) {
    logger.warn('Google Sheets no configurado (falta GOOGLE_SHEETS_ID o GOOGLE_SHEETS_API_KEY)');
    return [];
  }

  const tab = encodeURIComponent(config.GOOGLE_SHEETS_TAB);
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${config.GOOGLE_SHEETS_ID}` +
    `/values/${tab}?key=${config.GOOGLE_SHEETS_API_KEY}`;

  try {
    logger.info('Consultando inventario desde Google Sheets...');
    const response = await axios.get(url, { timeout: 10000 });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      logger.warn('Google Sheets: hoja vacía o sin datos');
      return [];
    }

    // Primera fila = encabezados
    const headers = rows[0].map((h) => normalize(h));

    // Mapear índices de columnas
    const columnIndices = {};
    headers.forEach((header, index) => {
      const mappedKey = COLUMN_MAP[header];
      if (mappedKey) {
        columnIndices[mappedKey] = index;
      }
    });

    // Validar que al menos tengamos "nombre"
    if (columnIndices.name === undefined) {
      logger.error(
        'Google Sheets: no se encontró columna de producto. ' +
        `Encabezados encontrados: ${headers.join(', ')}`
      );
      return [];
    }

    // Parsear filas de datos
    const products = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const name = row[columnIndices.name];

      // Ignorar filas sin nombre
      if (!name || name.toString().trim() === '') continue;

      products.push({
        id: i,
        name: name.toString().trim(),
        nameNormalized: normalize(name),
        price: columnIndices.price !== undefined
          ? parsePrice(row[columnIndices.price])
          : 0,
        available: columnIndices.available !== undefined
          ? parseAvailability(row[columnIndices.available])
          : true,
        presentation: columnIndices.presentation !== undefined
          ? (row[columnIndices.presentation] || '').toString().trim()
          : '',
        category: columnIndices.category !== undefined
          ? (row[columnIndices.category] || '').toString().trim()
          : '',
      });
    }

    logger.info(`Inventario cargado: ${products.length} productos desde Google Sheets`);
    return products;
  } catch (err) {
    if (err.response) {
      logger.error(
        `Google Sheets API error ${err.response.status}: ` +
        JSON.stringify(err.response.data)
      );
    } else {
      logger.error(`Google Sheets error de conexión: ${err.message}`);
    }
    return [];
  }
}

module.exports = { fetchFromGoogleSheets, normalize };