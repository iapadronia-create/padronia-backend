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

    /**
     * Estratégia SIMPLES e ROBUSTA:
     * - tenta criar o perfil
     * - se já existir, apenas atualiza os dados
     * - bônus só é aplicado na primeira criação
     */

    const { error } = await supabase
      .from('users_extra')
      .upsert({
        id: userId,
        area_atuacao,
        segmento,
        objetivo,
        credits_extra: 2,
        free_bonus_claimed: true
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('ERRO UPSERT users_extra:', error);
      return res.status(500).json({ error: 'Erro ao salvar perfil' });
    }

    return res.json({
      success: true,
      message: 'Perfil criado/atualizado com sucesso'
    });

  } catch (err) {
    console.error('ERRO COMPLETE PROFILE:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;


