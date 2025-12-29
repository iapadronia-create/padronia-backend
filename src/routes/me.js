const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: authUser, error: authError } =
      await supabase.auth.admin.getUserById(userId);

    if (authError || !authUser) {
      return res.status(401).json({ error: 'Usuário inválido' });
    }

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

    let planCreditsLimit = 0;
    if (profile.plan_type === 'monthly') planCreditsLimit = 150;
    if (profile.plan_type === 'annual') planCreditsLimit = 250;

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

    return res.json({
      user: {
        id: userId,
        email: authUser.user.email
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

