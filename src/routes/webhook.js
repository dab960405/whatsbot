// ============================================================
// RUTAS — Webhook de WhatsApp
// ============================================================

const { Router } = require('express');
const controller = require('../controllers/webhookController');
const signatureValidator = require('../middleware/signatureValidator');

const router = Router();

// GET  /webhook — Verificación del webhook (Meta)
router.get('/', controller.verify);

// POST /webhook — Recepción de eventos (mensajes, estados, etc.)
router.post('/', signatureValidator, controller.receive);

module.exports = router;