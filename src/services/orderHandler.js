// ============================================================
// SERVICIO — Manejador de pedidos
// ============================================================
// Gestiona el flujo progresivo de recolección de datos
// para pedidos a domicilio.
// ============================================================

const logger = require('../utils/logger');

const ORDER_PROMPTS = {
  quantity:
    `🛒 *NUEVO PEDIDO*\n\n` +
    `¿Cuántas unidades necesitas?\n\n` +
    `_Escribe solo el número (ej: 1, 2, 3)_\n` +
    `Escribe *0* para cancelar.`,

  address:
    `📍 *DIRECCIÓN DE ENTREGA*\n\n` +
    `Escribe tu dirección completa:\n` +
    `_Calle, número, colonia, referencias_\n\n` +
    `Escribe *0* para cancelar.`,

  name:
    `👤 *NOMBRE COMPLETO*\n\n` +
    `¿A nombre de quién será el pedido?\n\n` +
    `Escribe *0* para cancelar.`,

  phone:
    `📱 *TELÉFONO DE CONTACTO*\n\n` +
    `Escribe un número donde podamos contactarte.\n` +
    `_Ejemplo: 55-1234-5678_\n\n` +
    `Escribe *0* para cancelar.`,
};

/**
 * Genera el prompt de cantidad para un producto.
 */
function getQuantityPrompt(productName) {
  return `🛒 Producto seleccionado: *${productName}*\n\n¿Cuántas unidades necesitas?\n_Escribe el número (ej: 1, 2, 3)_\n\nEscribe *0* para cancelar.`;
}

/**
 * Valida la cantidad ingresada.
 */
function validateQuantity(input) {
  const qty = parseInt(input, 10);
  if (isNaN(qty) || qty <= 0) return null;
  if (qty > 99) return null;
  return qty;
}

/**
 * Valida la dirección.
 */
function validateAddress(input) {
  if (!input || input.trim().length < 10) return null;
  return input.trim();
}

/**
 * Valida el nombre.
 */
function validateName(input) {
  if (!input || input.trim().length < 3) return null;
  return input.trim();
}

/**
 * Valida el teléfono.
 */
function validatePhone(input) {
  if (!input) return null;
  const cleaned = input.replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.length < 7 || cleaned.length > 15) return null;
  if (!/^[\d+]+$/.test(cleaned)) return null;
  return input.trim();
}

/**
 * Genera el resumen del pedido para confirmación.
 */
function getOrderSummary(orderData) {
  const total = orderData.product.price * orderData.quantity;
  const shipping = 30;
  const grandTotal = total + shipping;

  return (
    `📋 *RESUMEN DE TU PEDIDO*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `💊 *${orderData.product.name}*\n` +
    `   ${orderData.product.presentation || ''}\n` +
    `📦 Cantidad: ${orderData.quantity}\n` +
    `💲 Precio unitario: $${orderData.product.price.toFixed(2)}\n` +
`💰 Subtotal: $${total.toFixed(2)}\n` +
`🛵 Envío: $${shipping.toFixed(2)}\n` +
`💵 *TOTAL: $${grandTotal.toFixed(2)}*\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `📍 ${orderData.address}\n` +
    `👤 ${orderData.name}\n` +
    `📱 ${orderData.phone}\n\n` +
    `*¿Confirmas tu pedido?*\n` +
    `*1.* ✅ Sí, confirmar\n` +
    `*2.* ❌ No, cancelar\n`
  );
}

/**
 * Genera mensaje de confirmación de pedido exitoso.
 */
function getOrderConfirmation(orderData) {
  return (
    `✅ *¡PEDIDO RECIBIDO!* 🎉\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📦 ${orderData.quantity}x ${orderData.product.name}\n` +
    `📍 ${orderData.address}\n` +
    `👤 ${orderData.name}\n` +
    `📱 ${orderData.phone}\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `⏱️ Tiempo estimado: 30-60 minutos\n` +
    `💳 Pago contra entrega\n\n` +
    `Un asesor confirmará tu pedido en breve.\n` +
    `¡Gracias por tu compra! 🙏\n\n` +
    `Escribe *menu* para volver al inicio.`
  );
}

/**
 * Genera mensaje de cancelación.
 */
function getOrderCancellation() {
  return `❌ Pedido cancelado.\n\nEscribe *menu* para volver al menú principal.`;
}

module.exports = {
  ORDER_PROMPTS,
  getQuantityPrompt,
  validateQuantity,
  validateAddress,
  validateName,
  validatePhone,
  getOrderSummary,
  getOrderConfirmation,
  getOrderCancellation,
};