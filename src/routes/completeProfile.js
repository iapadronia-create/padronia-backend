const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Cliente Supabase usando SERVICE ROLE (apenas backend)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post('/', async (req, res) => {
  try {
    // Usuário validado pelo authMiddleware
    const userId = req.user.id;

    const { area_atuacao, segmento, objetivo } = req.body;

    // Validação básica
    if (!area_atuacao || !segmento || !objetivo) {
      return res.status(400).json({
        error: 'Campos obrigatórios não informados'
      });
    }

    // INSERT explícito com onConflict (mais previsível que upsert)
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
      console.error('Erro ao salvar perfil:', error);
      return res.status(500).json({
        error: 'Erro ao salvar perfil'
      });
    }

    return res.json({
      success: true,
      message: 'Perfil salvo com sucesso'
    });

  } catch (err) {
    console.error('Erro interno completeProfile:', err);
    return res.status(500).json({
      error: 'Erro interno'
    });
  }
});

module.exports = router;
