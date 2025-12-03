require('dotenv').config();
const express = require('express');
const authMiddleware = require('./middleware/auth');
const generateRoute = require('./routes/generate');
const webhookRoute = require('./routes/webhook');

const app = express();
app.use(express.json());

// Webhook (não exige login)
app.use('/api/webhook', webhookRoute);

// Rota protegida (exige token do Supabase)
app.use('/api/generate', authMiddleware, generateRoute);

// Teste rápido
app.get('/health', (req, res) => res.send('ok'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
