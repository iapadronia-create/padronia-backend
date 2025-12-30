require('dotenv').config();
const express = require('express');

// Rotas
const generateRoute = require('./routes/generate');
const webhookRoute = require('./routes/webhook');
const completeProfileRoute = require('./routes/completeProfile');
const meRoute = require('./routes/me');

// Middlewares
const authMiddleware = require('./middleware/auth');
const checkCredits = require('./middleware/checkCredits');

const app = express();

app.use(express.json());

// Webhook (pagamentos, eventos externos, etc.)
app.use('/api/webhook', webhookRoute);

// ✅ AGORA PROTEGIDO
app.use('/api/complete-profile', authMiddleware, completeProfileRoute);

// Dados do usuário logado
app.use('/api/me', authMiddleware, meRoute);

// Geração de documentos
app.use(
  '/api/generate',
  authMiddleware,
  checkCredits,
  generateRoute
);

// Healthcheck
app.get('/health', (req, res) => {
  res.send('ok');
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});