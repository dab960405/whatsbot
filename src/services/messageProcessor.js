// ============================================================
// SERVICIO — Procesador de mensajes (con menú interactivo)
// ============================================================

const { sendTextMessage, markAsRead } = require('./whatsappService');
const { getAIResponse } = require('./ai');
const inventory = require('./inventory');
const menuHandler = require('./menuHandler');
const orderHandler = require('./orderHandler');
const { STATES, getSession, setState, resetSession } = require('../utils/sessionStore');
const logger = require('../utils/logger');
const dedup = require('../utils/dedup');

// -----------------------------------------------------------
// Constantes
// -----------------------------------------------------------
const MAX_INPUT_LENGTH = 500;

const FALLBACK_MESSAGE =
  'Disculpa, tuve un problema técnico 😅\n' +
  'Escribe *menu* para ver las opciones o *6* para hablar con un asesor.';

const NON_TEXT_MESSAGE =
  'Por el momento solo puedo leer mensajes de texto 📝\n\n' +
  'Escribe *menu* para ver las opciones disponibles.';

// Palabras clave globales (funcionan desde cualquier estado)
const GLOBAL_KEYWORDS = {
  menu: ['menu', 'menú', 'inicio', 'volver', 'regresar', 'home', 'hola', 'hi', 'hey'],
  help: ['ayuda', 'help', 'opciones'],
  human: ['asesor', 'agente', 'persona', 'humano', 'human'],
};

// -----------------------------------------------------------
// Detectar intención global
// -----------------------------------------------------------
function detectGlobalIntent(text) {
  const normalized = text.toLowerCase().trim();

  if (normalized === '0') return 'menu';

  for (const [intent, keywords] of Object.entries(GLOBAL_KEYWORDS)) {
    if (keywords.some((kw) => normalized === kw || normalized.startsWith(kw + ' '))) {
      return intent;
    }
  }

  return null;
}

// -----------------------------------------------------------
// Router principal del flujo conversacional
// -----------------------------------------------------------
async function handleMessage(from, text, contactName) {
  const session = getSession(from);
  const input = text.trim();
  const inputLower = input.toLowerCase();

  // Detectar intenciones globales
  const globalIntent = detectGlobalIntent(inputLower);

  if (globalIntent === 'menu') {
    resetSession(from);
    if (session.state === STATES.WELCOME) {
      return menuHandler.getWelcomeMessage(contactName);
    }
    return menuHandler.MENU.backToMenu + '\n\n' + menuHandler.getMainMenu();
  }

  if (globalIntent === 'help') {
    return menuHandler.getMainMenu();
  }

  if (globalIntent === 'human') {
    setState(from, STATES.HUMAN_ESCALATION);
    return menuHandler.MENU.humanEscalation;
  }

  // Router por estado actual
  switch (session.state) {
    case STATES.WELCOME:
      return handleWelcome(from, contactName);

    case STATES.MAIN_MENU:
      return handleMainMenu(from, input, inputLower, contactName);

    case STATES.SEARCH_PRODUCT:
      return handleSearchProduct(from, input);

    case STATES.PRODUCT_DETAIL:
      return handleProductDetail(from, input, session);

    case STATES.FAQ:
      return handleFAQ(from, input);

    case STATES.ORDER_PRODUCT:
      return handleOrderProduct(from, input, session);

    case STATES.ORDER_QUANTITY:
      return handleOrderQuantity(from, input, session);

    case STATES.ORDER_ADDRESS:
      return handleOrderAddress(from, input, session);

    case STATES.ORDER_NAME:
      return handleOrderName(from, input, session);

    case STATES.ORDER_PHONE:
      return handleOrderPhone(from, input, session);

    case STATES.ORDER_CONFIRM:
      return handleOrderConfirm(from, input, session);

    case STATES.HUMAN_ESCALATION:
      return menuHandler.MENU.humanEscalation;

    case STATES.AI_CHAT:
      return handleAIChat(from, input, contactName);

    default:
      resetSession(from);
      return menuHandler.getWelcomeMessage(contactName);
  }
}

// -----------------------------------------------------------
// Handlers por estado
// -----------------------------------------------------------

async function handleWelcome(from, contactName) {
  setState(from, STATES.MAIN_MENU);
  return menuHandler.getWelcomeMessage(contactName);
}

async function handleMainMenu(from, input, inputLower, contactName) {
  switch (input) {
    case '1': {
      // Buscar producto
      if (!inventory.isInventoryConfigured()) {
        setState(from, STATES.AI_CHAT);
        return menuHandler.MENU.inventoryOffline;
      }
      setState(from, STATES.SEARCH_PRODUCT);
      return menuHandler.MENU.searchPrompt;
    }

    case '2': {
      // Ver categorías
      if (!inventory.isInventoryConfigured()) {
        setState(from, STATES.AI_CHAT);
        return menuHandler.MENU.inventoryOffline;
      }
      try {
        const categories = await inventory.getCategories();
        setState(from, STATES.SEARCH_PRODUCT, { categories, viewMode: 'category' });
        return menuHandler.MENU.categoryPrompt(categories);
      } catch (err) {
        logger.error('Error cargando categorías:', err.message);
        return menuHandler.MENU.inventoryOffline;
      }
    }

    case '3': {
      // Consultar disponibilidad
      if (!inventory.isInventoryConfigured()) {
        setState(from, STATES.AI_CHAT);
        return menuHandler.MENU.inventoryOffline;
      }
      setState(from, STATES.SEARCH_PRODUCT, { viewMode: 'availability' });
      return menuHandler.MENU.availabilityPrompt;
    }

    case '4': {
      // Pedido a domicilio
      setState(from, STATES.ORDER_PRODUCT);
      return menuHandler.MENU.deliveryInfo;
    }

    case '5': {
      // Preguntas frecuentes
      setState(from, STATES.FAQ);
      return menuHandler.MENU.faq;
    }

    case '6': {
      // Asesor humano
      setState(from, STATES.HUMAN_ESCALATION);
      return menuHandler.MENU.humanEscalation;
    }

    default: {
      // Intento de búsqueda directa o chat con IA
      if (inputLower.length >= 3 && inventory.isInventoryConfigured()) {
        // Intentar buscar como producto
        try {
          const results = await inventory.searchProducts(input);
          if (results.length > 0) {
            setState(from, STATES.SEARCH_PRODUCT, { lastResults: results });
            return menuHandler.formatSearchResults(results, input);
          }
        } catch (err) {
          logger.error('Error buscando producto:', err.message);
        }
      }

      // Si no es número ni producto encontrado, usar IA
      setState(from, STATES.AI_CHAT);
      const aiReply = await getAIResponse(input, contactName);
      setState(from, STATES.MAIN_MENU);
      return aiReply + '\n\n_Escribe *menu* para ver opciones._';
    }
  }
}

async function handleSearchProduct(from, input) {
  const session = getSession(from);
  const { categories, viewMode, lastResults } = session.data;

  // Si hay categorías y el usuario selecciona por número
  if (viewMode === 'category' && categories && categories.length > 0) {
    const catIndex = parseInt(input, 10);
    if (catIndex >= 1 && catIndex <= categories.length) {
      try {
        const selectedCategory = categories[catIndex - 1];
        const products = await inventory.getProductsByCategory(selectedCategory);
        setState(from, STATES.SEARCH_PRODUCT, {
          lastResults: products,
          viewMode: 'list',
        });
        return menuHandler.formatCategoryProducts(products, selectedCategory);
      } catch (err) {
        logger.error('Error cargando categoría:', err.message);
        return menuHandler.MENU.inventoryOffline;
      }
    }
  }

  // Si hay resultados previos y el usuario selecciona por número
  if (lastResults && lastResults.length > 0) {
    const productIndex = parseInt(input, 10);
    if (productIndex >= 1 && productIndex <= lastResults.length) {
      const selectedProduct = lastResults[productIndex - 1];
      setState(from, STATES.PRODUCT_DETAIL, { selectedProduct });
      return menuHandler.formatProductDetail(selectedProduct);
    }
  }

  // Buscar producto por texto
  try {
    const results = await inventory.searchProducts(input);
    if (results.length === 0) {
      return menuHandler.MENU.noResults(input);
    }

    setState(from, STATES.SEARCH_PRODUCT, { lastResults: results, viewMode: 'list' });
    return menuHandler.formatSearchResults(results, input);
  } catch (err) {
    logger.error('Error buscando producto:', err.message);
    return menuHandler.MENU.inventoryOffline;
  }
}

async function handleProductDetail(from, input, session) {
  const { selectedProduct } = session.data;

  if (selectedProduct && selectedProduct.available) {
    switch (input) {
      case '1': {
        // Pedir este producto
        setState(from, STATES.ORDER_QUANTITY, {
          orderProduct: selectedProduct,
        });
        return orderHandler.getQuantityPrompt(selectedProduct.name);
      }
      case '2': {
        setState(from, STATES.SEARCH_PRODUCT);
        return menuHandler.MENU.searchPrompt;
      }
      case '3': {
        resetSession(from);
        return menuHandler.getMainMenu();
      }
      default:
        return `Escribe *1* para pedir, *2* para buscar otro o *3* para el menú.`;
    }
  } else {
    // Producto no disponible
    switch (input) {
      case '1': {
        setState(from, STATES.SEARCH_PRODUCT);
        return menuHandler.MENU.searchPrompt;
      }
      case '2': {
        setState(from, STATES.HUMAN_ESCALATION);
        return menuHandler.MENU.humanEscalation;
      }
      case '3': {
        resetSession(from);
        return menuHandler.getMainMenu();
      }
      default:
        return `Escribe *1* para buscar otro, *2* para asesor o *3* para menú.`;
    }
  }
}

async function handleFAQ(from, input) {
  const faqNum = parseInt(input, 10);

  if (faqNum >= 1 && faqNum <= 5) {
    const answer = menuHandler.MENU.faqAnswers[faqNum];
    return answer;
  }

  return menuHandler.MENU.invalidOption;
}

// -----------------------------------------------------------
// Handlers del flujo de pedido
// -----------------------------------------------------------

async function handleOrderProduct(from, input, session) {
  switch (input) {
    case '1': {
      // Quiere pedir — preguntar qué producto
      if (inventory.isInventoryConfigured()) {
        setState(from, STATES.SEARCH_PRODUCT, { viewMode: 'order' });
        return menuHandler.MENU.searchPrompt;
      } else {
        setState(from, STATES.AI_CHAT);
        return `Escribe el nombre del producto que necesitas y te ayudo 💬`;
      }
    }
    case '2': {
      resetSession(from);
      return menuHandler.getMainMenu();
    }
    default: {
      // Intento directo de buscar producto
      if (input.length >= 3 && inventory.isInventoryConfigured()) {
        try {
          const results = await inventory.searchProducts(input);
          if (results.length > 0) {
            setState(from, STATES.SEARCH_PRODUCT, { lastResults: results, viewMode: 'list' });
            return menuHandler.formatSearchResults(results, input);
          }
        } catch (err) {
          logger.error('Error buscando en pedido:', err.message);
        }
      }
      return menuHandler.MENU.deliveryInfo;
    }
  }
}

async function handleOrderQuantity(from, input, session) {
  const qty = orderHandler.validateQuantity(input);

  if (qty === null) {
    return `⚠️ Ingresa un número válido (1-99).\n_Ejemplo: 2_\n\nEscribe *0* para cancelar.`;
  }

  setState(from, STATES.ORDER_ADDRESS, { quantity: qty });
  return orderHandler.ORDER_PROMPTS.address;
}

async function handleOrderAddress(from, input, session) {
  const address = orderHandler.validateAddress(input);

  if (address === null) {
    return `⚠️ La dirección es muy corta.\nPor favor incluye calle, número y colonia.\n\nEscribe *0* para cancelar.`;
  }

  setState(from, STATES.ORDER_NAME, { address });
  return orderHandler.ORDER_PROMPTS.name;
}

async function handleOrderName(from, input, session) {
  const name = orderHandler.validateName(input);

  if (name === null) {
    return `⚠️ Por favor ingresa tu nombre completo (mínimo 3 caracteres).\n\nEscribe *0* para cancelar.`;
  }

  setState(from, STATES.ORDER_PHONE, { name });
  return orderHandler.ORDER_PROMPTS.phone;
}

async function handleOrderPhone(from, input, session) {
  const phone = orderHandler.validatePhone(input);

  if (phone === null) {
    return `⚠️ Número no válido. Ingresa un teléfono de 7-15 dígitos.\n_Ejemplo: 55-1234-5678_\n\nEscribe *0* para cancelar.`;
  }

  setState(from, STATES.ORDER_CONFIRM, { phone });

  // Construir datos completos del pedido
  const session2 = getSession(from);
  const orderData = {
    product: session2.data.orderProduct,
    quantity: session2.data.quantity,
    address: session2.data.address,
    name: session2.data.name,
    phone: session2.data.phone,
  };

  return orderHandler.getOrderSummary(orderData);
}

async function handleOrderConfirm(from, input, session) {
  switch (input) {
    case '1': {
      // Confirmar pedido
      const orderData = {
        product: session.data.orderProduct,
        quantity: session.data.quantity,
        address: session.data.address,
        name: session.data.name,
        phone: session.data.phone,
      };

      logger.info(
        `📦 PEDIDO CONFIRMADO | ${orderData.name} | ` +
        `${orderData.quantity}x ${orderData.product.name} | ` +
        `Tel: ${orderData.phone} | Dir: ${orderData.address}`
      );

      resetSession(from);
      return orderHandler.getOrderConfirmation(orderData);
    }
    case '2': {
      resetSession(from);
      return orderHandler.getOrderCancellation();
    }
    default:
      return `Escribe *1* para confirmar o *2* para cancelar.`;
  }
}

// -----------------------------------------------------------
// Handler de chat con IA (fallback inteligente)
// -----------------------------------------------------------
async function handleAIChat(from, input, contactName) {
  const response = await getAIResponse(input, contactName);
  setState(from, STATES.MAIN_MENU);
  return response + '\n\n_Escribe *menu* para ver opciones._';
}

// -----------------------------------------------------------
// PUNTO DE ENTRADA (desde webhookController)
// -----------------------------------------------------------
async function processIncomingMessage(messageData) {
  const { messageId, from, type, text, contactName } = messageData;

  // Deduplicación
  if (dedup.isDuplicate(messageId)) {
    logger.warn(`Mensaje duplicado ignorado: ${messageId}`);
    return;
  }

  logger.info(
    `Mensaje de ${from} (${contactName}) | Tipo: ${type} | ID: ${messageId}`
  );

  // Marcar como leído
  markAsRead(messageId).catch(() => {});

  // Solo texto
  if (type !== 'text' || !text) {
    try {
      await sendTextMessage(from, NON_TEXT_MESSAGE);
    } catch (err) {
      logger.error('Error enviando non-text response:', err.message);
    }
    return;
  }

  // Sanitizar
  const sanitizedText = text.trim().substring(0, MAX_INPUT_LENGTH);
  if (sanitizedText.length === 0) {
    try {
      await sendTextMessage(from, menuHandler.getWelcomeMessage(contactName));
      setState(from, STATES.MAIN_MENU);
    } catch (err) {
      logger.error('Error enviando welcome:', err.message);
    }
    return;
  }

  // Procesar con el router de flujo
  try {
    const response = await handleMessage(from, sanitizedText, contactName);
    await sendTextMessage(from, response);
  } catch (err) {
    logger.error('Error en pipeline:', err.message);
    try {
      await sendTextMessage(from, FALLBACK_MESSAGE);
    } catch (sendErr) {
      logger.error('Error enviando fallback:', sendErr.message);
    }
  }
}

module.exports = { processIncomingMessage };