const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Token não informado' });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    const userId = req.user.id;

    const { area_atuacao, segmento, objetivo } = req.body;

    if (!area_atuacao || !segmento || !objetivo) {
      return res.status(400).json({
        error: 'Campos obrigatórios não informados'
      });
    }

    const { error } = await supabase
      .from('users_extra')
      .upsert(
        {
          id: userId,
          area_atuacao,
          segmento,
          objetivo
        },
        { onConflict: 'id' }
      );

    if (error) {
  console.error('SUPABASE ERROR >>>', error);

  return res.status(500).json({
    error: 'Erro ao salvar perfil',
    supabase: {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    }
  });
}


    return res.json({
      success: true,
      message: 'Perfil salvo com sucesso'
    });

  } catch (err) {
    console.error('Erro interno:', err);
    return res.status(500).json({
      error: 'Erro interno'
    });
  }
});

module.exports = router;