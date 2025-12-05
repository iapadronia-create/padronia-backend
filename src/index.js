// Carrega variáveis de ambiente do arquivo .env
require('dotenv').config();

// Importa o framework Express (servidor HTTP em Node)
const express = require('express');

// Importa o middleware de autenticação (valida token do Supabase)
const authMiddleware = require('./middleware/auth');

// Importa a rota de geração de documentos (já existente no seu projeto)
const generateRoute = require('./routes/generate');

// Importa a rota de webhook (já existente, usada para callbacks externos)
const webhookRoute = require('./routes/webhook');

// Importa a rota que criamos para completar o perfil e liberar créditos
const completeProfileRoute = require('./routes/completeProfile');

// Cria a aplicação Express
const app = express();

// Habilita o parse automático de JSON no corpo das requisições
app.use(express.json());

// Webhook (não exige login, pois recebe requisições externas)
app.use('/api/webhook', webhookRoute);

// Onboarding + créditos grátis (não usa authMiddleware, 
// porque a validação de token é feita dentro da própria rota)
app.use('/api/complete-profile', completeProfileRoute);

// Rota protegida (exige token do Supabase via authMiddleware)
app.use('/api/generate', authMiddleware, generateRoute);

// Rota simples para testar se o servidor está no ar
app.get('/health', (req, res) => res.send('ok'));

// Define a porta do servidor (Railway ou 8080 local)
const PORT = process.env.PORT || 8080;

// Inicia o servidor
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));


