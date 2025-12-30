const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

/**
 * 🔴 LOG DE PROVA DE ENV (TEMPORÁRIO)
 * Isso serve APENAS para confirmar que o Railway
 * está injetando a SERVICE ROLE corretamente.
 */
console.log(
  'SERVICE ROLE PREFIX:',
  process.env.SUPABASE_SERVICE_ROLE_KEY
    ? process.env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 10)
    : 'UNDEFINED'
);

// Cliente Supabase (backend only)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { area_atuacao, segmento, objetivo } = req.body;

    if (!area_atuacao || !segmento || !objetivo) {
      return res.status(400).json({
        error: 'Campos obrigatórios não informados'
      });
    }

    const { error } = await supabase
      .from('users_extra')
      .insert(
        {
          id: userId,
          area_atuacao,
          segmento,
          objetivo
        },
        { onConflict: 'id' }
      );

    if (error) {
      console.error('SUPABASE ERROR FULL >>>', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });

      return res.status(500).json({
        error: 'Erro ao salvar perfil'
      });
    }

    return res.json({
      success: true,
      message: 'Perfil salvo com sucesso'
    });

  } catch (err) {
    console.error('ERRO JS PURO >>>', err);
    return res.status(500).json({
      error: 'Erro interno'
    });
  }
});

module.exports = router;
