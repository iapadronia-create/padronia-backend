const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Token não informado' });
    }

    // Cria client Supabase com ANON KEY
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // 🔑 Injeta explicitamente o token do usuário
    const token = authHeader.replace('Bearer ', '');
    await supabase.auth.setSession({
      access_token: token,
      refresh_token: token
    });

    const userId = req.user.id;

    const { area_atuacao, segmento, objetivo } = req.body;

    if (!area_atuacao || !segmento || !o_
