// ============================================================
// SERVICIO — Manejador del menú interactivo
// ============================================================
// Gestiona la navegación del menú principal y submenús.
// Diseñado basado en patrones de farmacias reales en WhatsApp.
// ============================================================

const inventory = require('./inventory');
const logger = require('../utils/logger');

// -----------------------------------------------------------
// Textos del menú
// -----------------------------------------------------------
const MENU = {
  welcome: (name) =>
    `¡Hola${name ? ` ${name}` : ''}! 👋\n` +
    `Bienvenido/a a *FarmaBot* 🏥\n` +
    `Tu farmacia de confianza.\n\n` +
    `¿En qué puedo ayudarte hoy?`,

  main:
    `📋 *MENÚ PRINCIPAL*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `*1.* 🔍 Buscar producto\n` +
    `*2.* 📦 Ver categorías\n` +
    `*3.* 💊 Consultar disponibilidad\n` +
    `*4.* 🛵 Pedido a domicilio\n` +
    `*5.* ❓ Preguntas frecuentes\n` +
    `*6.* 👨‍⚕️ Hablar con un asesor\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `Escribe el *número* de la opción\n` +
    `o escribe directamente tu consulta 💬`,

  searchPrompt:
    `🔍 *BUSCAR PRODUCTO*\n\n` +
    `Escribe el nombre del medicamento o producto que necesitas.\n\n` +
    `_Ejemplo: paracetamol, ibuprofeno, vitamina c_\n\n` +
    `Escribe *0* para volver al menú.`,

  categoryPrompt: (categories) => {
    if (categories.length === 0) {
      return `📦 No hay categorías disponibles en este momento.\n\nEscribe *0* para volver al menú.`;
    }
    let text = `📦 *CATEGORÍAS*\n━━━━━━━━━━━━━━━━━━\n`;
    categories.forEach((cat, i) => {
      text += `*${i + 1}.* ${cat}\n`;
    });
    text += `━━━━━━━━━━━━━━━━━━\n`;
    text += `Escribe el *número* de la categoría\n`;
    text += `o *0* para volver al menú.`;
    return text;
  },

  availabilityPrompt:
    `💊 *CONSULTAR DISPONIBILIDAD*\n\n` +
    `Escribe el nombre del producto que quieres verificar.\n\n` +
    `_Ejemplo: omeprazol, aspirina_\n\n` +
    `Escribe *0* para volver al menú.`,

  deliveryInfo:
    `🛵 *PEDIDO A DOMICILIO*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📍 Cobertura: Zona urbana\n` +
    `⏱️ Tiempo estimado: 30-60 min\n` +
    `💰 Costo de envío: $30.00\n` +
    `🛒 Pedido mínimo: $100.00\n\n` +
    `*¿Deseas hacer un pedido?*\n` +
    `*1.* ✅ Sí, quiero pedir\n` +
    `*2.* 📋 Ver menú principal\n\n` +
    `_También puedes escribir el producto que necesitas._`,

  faq:
    `❓ *PREGUNTAS FRECUENTES*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `*1.* 🕐 Horarios de atención\n` +
    `*2.* 📍 Ubicación\n` +
    `*3.* 💳 Métodos de pago\n` +
    `*4.* 🛵 Información de envíos\n` +
    `*5.* 📞 Teléfono de contacto\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `Escribe el *número* o *0* para volver.`,

  faqAnswers: {
    1: `🕐 *HORARIO DE ATENCIÓN*\n\n📅 Lunes a Sábado: 8:00 - 21:00\n📅 Domingos: 9:00 - 14:00\n📅 Festivos: 9:00 - 14:00\n\nEscribe *0* para volver al menú.`,
    2: `📍 *UBICACIÓN*\n\nEstamos en Av. Principal #123,\nCol. Centro, CP 12345\n\n🗺️ Te podemos compartir ubicación por Google Maps.\n¿Deseas que un asesor te la envíe?\n\nEscribe *0* para volver al menú.`,
    3: `💳 *MÉTODOS DE PAGO*\n\n✅ Efectivo\n✅ Tarjeta débito/crédito\n✅ Transferencia bancaria\n✅ Pago contra entrega\n\nEscribe *0* para volver al menú.`,
    4: `🛵 *INFORMACIÓN DE ENVÍOS*\n\n📍 Cobertura: Zona urbana\n⏱️ Tiempo: 30-60 minutos\n💰 Costo: $30.00\n🛒 Pedido mínimo: $100.00\n📦 Envío gratis en compras +$500\n\nEscribe *0* para volver al menú.`,
    5: `📞 *CONTACTO*\n\n📱 WhatsApp: Este chat\n☎️ Teléfono: (555) 123-4567\n📧 Email: farmacia@ejemplo.com\n\nEscribe *0* para volver al menú.`,
  },

  humanEscalation:
    `👨‍⚕️ *ASESOR HUMANO*\n\n` +
    `Te comunicaremos con un asesor de la farmacia.\n\n` +
    `⏱️ Tiempo de respuesta estimado: 5-10 minutos.\n` +
    `🕐 Horario de asesores: L-S 8:00-21:00\n\n` +
    `Un asesor te contactará pronto. ¡Gracias por tu paciencia! 🙏\n\n` +
    `Escribe *menu* para volver al menú principal.`,

  noResults: (query) =>
    `😔 No encontré resultados para *"${query}"*.\n\n` +
    `💡 Intenta con:\n` +
    `• Otro nombre del producto\n` +
    `• Solo la primera palabra\n` +
    `• El nombre genérico\n\n` +
    `O escribe *6* para hablar con un asesor.\n` +
    `Escribe *0* para volver al menú.`,

  inventoryOffline:
    `⚠️ El sistema de inventario no está disponible en este momento.\n\n` +
    `Puedes:\n` +
    `*1.* 💬 Consultar por chat (te ayudo con lo que sé)\n` +
    `*2.* 👨‍⚕️ Hablar con un asesor\n` +
    `*3.* 📋 Ver menú principal\n\n` +
    `_Disculpa las molestias._`,

  invalidOption:
    `🤔 No entendí tu selección.\n\n` +
    `Por favor escribe el *número* de la opción que deseas\n` +
    `o escribe *menu* para ver las opciones disponibles.`,

  backToMenu: `✅ Volviendo al menú principal...`,
};

// -----------------------------------------------------------
// Funciones del menú
// -----------------------------------------------------------

/**
 * Genera mensaje de bienvenida + menú.
 */
function getWelcomeMessage(contactName) {
  return MENU.welcome(contactName) + '\n\n' + MENU.main;
}

/**
 * Genera menú principal solo.
 */
function getMainMenu() {
  return MENU.main;
}

/**
 * Formatea resultados de búsqueda de productos.
 */
function formatSearchResults(products, query) {
  if (products.length === 0) {
    return MENU.noResults(query);
  }

  let text = `🔍 *Resultados para "${query}":*\n━━━━━━━━━━━━━━━━━━\n\n`;

  products.forEach((product, i) => {
    text += inventory.formatProduct(product, true, i + 1) + '\n\n';
  });

  text += `━━━━━━━━━━━━━━━━━━\n`;
  text += `Escribe el *número* del producto para más detalles\n`;
  text += `o *0* para volver al menú.`;

  return text;
}

/**
 * Formatea detalle de un producto.
 */
function formatProductDetail(product) {
  const status = product.available ? '✅ Disponible' : '❌ Agotado';
  const price = product.price > 0 ? `
$$
{product.price.toFixed(2)}` : 'Consultar';
  const presentation = product.presentation || 'No especificada';
  const category = product.category || 'General';

  let text =
    `💊 *${product.name}*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `💲 Precio: *${price}*\n` +
    `📦 Estado: ${status}\n` +
    `📋 Presentación: ${presentation}\n` +
    `🏷️ Categoría: ${category}\n` +
    `━━━━━━━━━━━━━━━━━━\n\n`;

  if (product.available) {
    text += `¿Qué deseas hacer?\n`;
    text += `*1.* 🛒 Pedir este producto\n`;
    text += `*2.* 🔍 Buscar otro producto\n`;
    text += `*3.* 📋 Menú principal\n`;
  } else {
    text += `Este producto no está disponible.\n\n`;
    text += `*1.* 🔍 Buscar otro producto\n`;
    text += `*2.* 👨‍⚕️ Consultar con asesor\n`;
    text += `*3.* 📋 Menú principal\n`;
  }

  return text;
}

/**
 * Formatea productos de una categoría.
 */
function formatCategoryProducts(products, categoryName) {
  if (products.length === 0) {
    return `📦 No hay productos en la categoría *${categoryName}*.\n\nEscribe *0* para volver.`;
  }

  let text = `📦 *${categoryName.toUpperCase()}*\n━━━━━━━━━━━━━━━━━━\n\n`;

  products.forEach((product, i) => {
    text += inventory.formatProduct(product, true, i + 1) + '\n\n';
  });

  text += `━━━━━━━━━━━━━━━━━━\n`;
  text += `Escribe el *número* para ver detalles\n`;
  text += `o *0* para volver al menú.`;

  return text;
}

module.exports = {
  MENU,
  getWelcomeMessage,
  getMainMenu,
  formatSearchResults,
  formatProductDetail,
  formatCategoryProducts,
};