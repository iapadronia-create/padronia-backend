const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Créditos por tipo de documento (V1 TRAVADO)
const CREDIT_COST = {
  POP: 2,
  CHECKLIST: 1,
  FICHA_TECNICA: 1
};

// Geração MOCK (V1) — depois entra IA / N8N
function generateMockDocument(type, description) {
  return `
DOCUMENTO: ${type}

Descrição solicitada:
${description}

Conteúdo gerado automaticamente pela PadronIA (versão inicial).

Este documento deve ser revisado pelo responsável técnico antes do uso.
`;
}

router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { document_type, description } = req.body;

    // Validação básica
    if (!document_type || !description) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Informe o tipo de documento e a descrição.'
      });
    }

    if (!CREDIT_COST[document_type]) {
      return res.status(400).json({
        error: 'INVALID_DOCUMENT_TYPE',
        message: 'Tipo de documento não suportado nesta versão.'
      });
    }

    // Buscar dados do usuário
    const { data: userExtra, error: userError } = await supabase
      .from('users_extra')
      .select('plan_type, credits_base, credits_extra')
      .eq('id', userId)
      .single();

    if (userError || !userExtra) {
      return res.status(500).json({
        error: 'USER_NOT_FOUND',
        message: 'Não foi possível identificar os dados do usuário.'
      });
    }

    const creditsAvailable =
      (userExtra.credits_base || 0) + (userExtra.credits_extra || 0);

    const creditsRequired = CREDIT_COST[document_type];

    // 🚨 SEM CRÉDITOS — CENÁRIOS ESTRATÉGICOS
    if (creditsAvailable < creditsRequired) {
      // FREE
      if (userExtra.plan_type === 'free') {
        return res.status(402).json({
          error: 'NO_CREDITS_FREE',
          title: 'Seus créditos gratuitos chegaram ao fim',
          message:
            'Você usou os créditos iniciais da PadronIA para testar a geração de documentos. Para continuar criando POPs, Checklists e Fichas Técnicas dentro de um limite mensal de créditos, você pode fazer upgrade para o plano mensal.',
          cta: {
            type: 'UPGRADE',
            label: 'Fazer upgrade'
          }
        });
      }

      // ASSINANTE
      return res.status(402).json({
        error: 'NO_CREDITS_SUBSCRIBER',
        title: 'Seus créditos deste mês foram utilizados',
        message:
          'Parece que você já usou todos os créditos disponíveis neste ciclo. Se precisar gerar mais documentos agora, você pode adicionar créditos extras ou aguardar a renovação mensal.',
        cta: {
          type: 'BUY_CREDITS',
          label: 'Adicionar créditos'
        }
      });
    }

    // 🧮 DÉBITO DE CRÉDITO (prioriza base, depois extra)
    let newCreditsBase = userExtra.credits_base;
    let newCreditsExtra = userExtra.credits_extra;
    let remaining = creditsRequired;

    if (newCreditsBase >= remaining) {
      newCreditsBase -= remaining;
      remaining = 0;
    } else {
      remaining -= newCreditsBase;
      newCreditsBase = 0;
      newCreditsExtra -= remaining;
    }

    // Atualiza créditos
    const { error: updateError } = await supabase
      .from('users_extra')
      .update({
        credits_base: newCreditsBase,
        credits_extra: newCreditsExtra
      })
      .eq('id', userId);

    if (updateError) {
      return res.status(500).json({
        error: 'CREDIT_UPDATE_FAILED',
        message: 'Não foi possível atualizar os créditos.'
      });
    }

    // 📄 GERA DOCUMENTO (mock)
    const content = generateMockDocument(document_type, description);

    return res.json({
      success: true,
      document_type,
      credits_used: creditsRequired,
      credits_remaining: newCreditsBase + newCreditsExtra,
      content
    });
  } catch (err) {
    console.error('ERRO /api/generate >>>', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Erro interno ao gerar documento.'
    });
  }
});

module.exports = router;

