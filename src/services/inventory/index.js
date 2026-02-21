// ============================================================
// INVENTARIO — Interfaz pública
// ============================================================
// Capa de abstracción sobre el proveedor de inventario.
// Actualmente usa Google Sheets, pero el diseño desacoplado
// permite cambiar a base de datos u otra fuente fácilmente.
// ============================================================

const config = require('../../config/env');
const logger = require('../../utils/logger');
const InventoryCache = require('./cache');
const { fetchFromGoogleSheets, normalize } = require('./googleSheetsProvider');

// Cache singleton
const cache = new InventoryCache(config.INVENTORY_CACHE_TTL);

/**
 * Verifica si el inventario está configurado.
 */
function isInventoryConfigured() {
  return !!(config.GOOGLE_SHEETS_ID && config.GOOGLE_SHEETS_API_KEY);
}

/**
 * Obtiene todos los productos (con cache).
 * @returns {Promise<Array>}
 */
async function getAllProducts() {
  // Intentar cache primero
  const cached = cache.get();
  if (cached) {
    logger.debug(`Inventario servido desde cache (${cached.length} productos)`);
    return cached;
  }

  // Fetch desde Google Sheets
  const products = await fetchFromGoogleSheets();
  if (products.length > 0) {
    cache.set(products);
  }

  return products;
}

/**
 * Busca productos por nombre (búsqueda parcial, fuzzy simple).
 * @param {string} query - Término de búsqueda
 * @returns {Promise<Array>} Productos que coinciden
 */
async function searchProducts(query) {
  const products = await getAllProducts();
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) return [];

  // Dividir la consulta en palabras para búsqueda más flexible
  const queryWords = normalizedQuery.split(/\s+/).filter((w) => w.length >= 2);

  // Buscar productos donde todas las palabras clave aparezcan
  const results = products.filter((product) => {
    const target = product.nameNormalized + ' ' + normalize(product.category);
    return queryWords.every((word) => target.includes(word));
  });

  // Si no hay resultados con todas las palabras, buscar con al menos una
  if (results.length === 0) {
    const partial = products.filter((product) => {
      const target = product.nameNormalized + ' ' + normalize(product.category);
      return queryWords.some((word) => target.includes(word));
    });
    return partial.slice(0, 10); // Máximo 10 resultados parciales
  }

  return results.slice(0, 10); // Máximo 10 resultados
}

/**
 * Obtiene un producto por su ID (fila en la hoja).
 * @param {number} productId
 * @returns {Promise<object|null>}
 */
async function getProductById(productId) {
  const products = await getAllProducts();
  return products.find((p) => p.id === productId) || null;
}

/**
 * Obtiene categorías únicas.
 * @returns {Promise<Array<string>>}
 */
async function getCategories() {
  const products = await getAllProducts();
  const cats = new Set(products.map((p) => p.category).filter(Boolean));
  return [...cats].sort();
}

/**
 * Obtiene productos por categoría.
 * @param {string} category
 * @returns {Promise<Array>}
 */
async function getProductsByCategory(category) {
  const products = await getAllProducts();
  const normalizedCat = normalize(category);
  return products.filter((p) => normalize(p.category) === normalizedCat);
}

/**
 * Formatea un producto para mostrarlo en WhatsApp.
 * @param {object} product
 * @param {boolean} showIndex - Mostrar número para selección
 * @param {number} index
 * @returns {string}
 */
function formatProduct(product, showIndex = false, index = 0) {
  const status = product.available ? '✅ Disponible' : '❌ Agotado';
  const price = product.price > 0 ? `
$$
{product.price.toFixed(2)}` : 'Consultar precio';
  const presentation = product.presentation ? `\n   📋 ${product.presentation}` : '';
  const prefix = showIndex ? `*${index}.* ` : '💊 ';

  return `${prefix}*${product.name}*\n   💲 ${price} | ${status}${presentation}`;
}

module.exports = {
  isInventoryConfigured,
  getAllProducts,
  searchProducts,
  getProductById,
  getCategories,
  getProductsByCategory,
  formatProduct,
};