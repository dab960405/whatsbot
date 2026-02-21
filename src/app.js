// ============================================================
// EXPRESS APP — Configuración principal
// ============================================================

const express = require('express');
const webhookRoutes = require('./routes/webhook');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');

const app = express();
app.set('trust proxy', 1);

// -----------------------------------------------------------
// Body parser con captura de raw body para firma Meta
// -----------------------------------------------------------
app.use(
  express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// -----------------------------------------------------------
// Rate limiter global
// -----------------------------------------------------------
app.use(rateLimiter);

// -----------------------------------------------------------
// Rutas de salud / status
// -----------------------------------------------------------
app.get('/', (_req, res) => {
  res.status(200).json({
    status: 'running',
    service: 'whatsapp-pharmacy-bot',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// -----------------------------------------------------------
// Rutas del webhook
// -----------------------------------------------------------
app.use('/webhook', webhookRoutes);

// -----------------------------------------------------------
// 404 para rutas no definidas
// -----------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// -----------------------------------------------------------
// Manejador global de errores
// -----------------------------------------------------------
app.use(errorHandler);

// -----------------------------------------------------------
// EXPORTAR LA INSTANCIA DE EXPRESS
// -----------------------------------------------------------
module.exports = app;