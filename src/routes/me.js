const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Cliente admin apenas para acesso ao banco (SERVICE ROLE)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.get('/', async (req, res) => {
  try {
    // Usuário já validado pelo middleware
    const userId = req.user.id;
    const email = req.user.email;

    // Buscar perfil + créditos
    const { data: profile, error: profileError } = await supabase
      .from('users_extra')
      .select(`
        area_atuacao,
        segmento,
        objetivo,
        plan_type,
        plan_started_at,
        credits_base,
        credits_extra
      `)
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Perfil não encontrado' });
    }

    // Definir limite conforme plano
    let planCreditsLimit = 0;
    if (profile.plan_type === 'monthly') planCreditsLimit = 150;
    if (profile.plan_type === 'annual') planCreditsLimit = 250;

    // Verificar reset mensal
    let shouldReset = false;

    if (profile.plan_type !== 'free' && profile.plan_started_at) {
      const startedAtMs = Date.parse(profile.plan_started_at);
      const nowMs = Date.now();

      if (!isNaN(startedAtMs)) {
        const diffDays = (nowMs - startedAtMs) / (1000 * 60 * 60 * 24);
        if (diffDays >= 30) {
          shouldReset = true;
        }
      }
    }

    if (shouldReset) {
      const nowIso = new Date().toISOString();

      await supabase
        .from('users_extra')
        .update({
          credits_base: planCreditsLimit,
          plan_started_at: nowIso
        })
        .eq('id', userId);

      profile.credits_base = planCreditsLimit;
      profile.plan_started_at = nowIso;
    }

    // RESPOSTA FINAL COM MARCADOR DE PRODUÇÃO
    return res.json({
      __PRODUCAO_OK__: 'VERSAO_2025_12_28_RAILWAY',

      user: {
        id: userId,
        email: email
      },

      profile: {
        area_atuacao: profile.area_atuacao,
        segmento: profile.segmento,
        objetivo: profile.objetivo
      },

      plan: {
        type: profile.plan_type,
        credits_base_limit: planCreditsLimit,
        last_reset: profile.plan_started_at
      },

      credits: {
        base: profile.credits_base,
        extra: profile.credits_extra
      }
    });

  } catch (err) {
    console.error('ERRO /api/me:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;


