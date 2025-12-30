const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Cliente admin apenas para banco
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post('/', async (req, res) => {
  try {
    // Usuário já validado pelo authMiddleware
    const userId = req.user.id;

    // Dados do perfil
    const { area_atuacao, segmento, objetivo, device_id } = req.body;

    if (!area_atuacao || !segmento || !objetivo) {
      return res.status(400).json({ error: 'Dados obrigatórios ausentes' });
    }

    // Buscar registro existente
    const { data: existing } = await supabase
      .from('users_extra')
      .select('credits_extra, free_bonus_claimed')
      .eq('id', userId)
      .single();

    let creditsExtra = existing?.credits_extra ?? 0;
    let freeBonusClaimed = existing?.free_bonus_claimed ?? false;

    // Bônus de onboarding (apenas uma vez)
    if (!freeBonusClaimed) {
      creditsExtra += 2;
      freeBonusClaimed = true;
    }

    // Upsert do perfil
    const { error: upsertError } = await supabase
      .from('users_extra')
      .upsert({
        id: userId,
        area_atuacao,
        segmento,
        objetivo,
        device_id,
        credits_extra: creditsExtra,
        free_bonus_claimed: freeBonusClaimed
      });

    if (upsertError) {
      throw upsertError;
    }

    return res.json({
      success: true,
      credits_extra: creditsExtra
    });

  } catch (err) {
    console.error('ERRO COMPLETE PROFILE:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;



