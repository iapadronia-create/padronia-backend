const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Cliente admin (SERVICE ROLE) apenas para banco
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post('/', async (req, res) => {
  try {
    // authMiddleware já garantiu isso
    const userId = req.user.id;

    const { area_atuacao, segmento, objetivo } = req.body;

    if (!area_atuacao || !segmento || !objetivo) {
      return res.status(400).json({
        error: 'Campos obrigatórios não informados'
      });
    }

    // Upsert MINIMALISTA (somente colunas confirmadas)
    const { error } = await supabase
      .from('users_extra')
      .upsert({
        id: userId,
        area_atuacao,
        segmento,
        objetivo
      });

    if (error) {
      console.error('ERRO SUPABASE UPSERT:', error);
      return res.status(500).json({ error: 'Erro ao salvar perfil' });
    }

    return res.json({
      success: true,
      message: 'Perfil salvo com sucesso'
    });

  } catch (err) {
    console.error('ERRO COMPLETE PROFILE:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;



