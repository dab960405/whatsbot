// ============================================================
// INVENTARIO — Cache en memoria con TTL
// ============================================================

const logger = require('../../utils/logger');

class InventoryCache {
  constructor(ttlSeconds) {
    this.ttl = ttlSeconds * 1000;
    this.data = null;
    this.lastFetch = 0;
  }

  /**
   * Verifica si el cache es válido.
   */
  isValid() {
    return this.data !== null && (Date.now() - this.lastFetch) < this.ttl;
  }

  /**
   * Almacena datos en cache.
   * @param {Array} products
   */
  set(products) {
    this.data = products;
    this.lastFetch = Date.now();
    logger.info(`Cache de inventario actualizado: ${products.length} productos`);
  }

  /**
   * Obtiene datos del cache.
   * @returns {Array|null}
   */
  get() {
    if (this.isValid()) {
      return this.data;
    }
    return null;
  }

  /**
   * Invalida el cache.
   */
  invalidate() {
    this.data = null;
    this.lastFetch = 0;
  }
}

module.exports = InventoryCache;