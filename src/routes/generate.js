const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const cost = req.documentCost;
    const documentKey = req.documentKey;

    // 1. Buscar créditos atuais
    const { data: user, error: selectError } = await supabase
      .from('users_extra')
      .select('credits')
      .eq('id', userId)
      .single();

    if (selectError || !user) {
      return res.status(403).json({
        error: 'Usuário sem perfil completo'
      });
    }

    const newCredits = user.credits - cost;

    // 2. Debitar créditos
    const { error: updateError } = await supabase
      .from('users_extra')
      .update({ credits: newCredits })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    // 3. Registrar histórico (simples)
    await supabase.from('documents_history').insert({
      user_id: userId,
      document_key: documentKey,
      credits_used: cost
    });

    // 4. (placeholder) Geração do documento
    // Aqui depois entra IA / prompt / etc.
    const generatedDocument = {
      document_key: documentKey,
      status: 'generated'
    };

    return res.json({
      success: true,
      credits_remaining: newCredits,
      document: generatedDocument
    });

  } catch (err) {
    console.error('ERRO GENERATE:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;

