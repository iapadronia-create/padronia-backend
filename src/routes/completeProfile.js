const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post('/', async (req, res) => {
  try {
    // 1. Validar token
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não informado' });
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { data: authData, error: authError } =
      await supabase.auth.getUser(accessToken);

    if (authError || !authData?.user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const userId = authData.user.id;

    // 2. Dados do perfil
    const { area_atuacao, segmento, objetivo, device_id } = req.body;

    // 3. Buscar registro existente
    const { data: existing, error: selectError } = await supabase
      .from('users_extra')
      .select('*')
      .eq('id', userId)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      throw selectError;
    }

    // 4. Créditos
    let credits = existing?.credits ?? 0;
    let freeBonusClaimed = existing?.free_bonus_claimed ?? false;

    if (!freeBonusClaimed) {
      credits += 2;
      freeBonusClaimed = true;
    }

    // 5. Upsert
    const { error: upsertError } = await supabase
      .from('users_extra')
      .upsert({
        id: userId,
        area_atuacao,
        segmento,
        objetivo,
        device_id,
        credits,
        free_bonus_claimed: freeBonusClaimed
      });

    if (upsertError) {
      throw upsertError;
    }

    // 6. Resposta
    return res.json({
      success: true,
      credits
    });

  } catch (err) {
    console.error('ERRO COMPLETE PROFILE:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;


