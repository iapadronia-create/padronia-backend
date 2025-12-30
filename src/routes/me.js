const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: req.headers.authorization
          }
        }
      }
    );

    const userId = req.user.id;

    const { data, error } = await supabase
      .from('users_extra')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: 'Perfil não encontrado'
      });
    }

    return res.json({
      user: {
        id: req.user.id,
        email: req.user.email
      },
      profile: {
        area_atuacao: data.area_atuacao,
        segmento: data.segmento,
        objetivo: data.objetivo
      },
      plan: {
        type: data.plan_type,
        credits_base_limit: data.credits_base_limit,
        last_reset: data.plan_started_at
      },
      credits: {
        base: data.credits_base,
        extra: data.credits_extra
      }
    });

  } catch (err) {
    console.error('Erro /api/me:', err);
    return res.status(500).json({
      error: 'Erro interno'
    });
  }
});

module.exports = router;
