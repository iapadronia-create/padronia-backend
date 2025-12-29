const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Mapeamento oficial de custo por documento
const DOCUMENT_COST = {
  // POPs e Procedimentos
  pop: 1,
  procedimento_interno: 1,
  mbp: 3,

  // Checklists
  checklist: 1,

  // Documentos Técnicos
  ficha_tecnica: 1,

  // Relatórios
  relatorio: 2,

  // Planos
  plano_acao: 2,
  plano_higienizacao: 2,
  plano_controle_pragas: 2,
  plano_capacitacao: 2,
  cronograma_limpeza: 1,

  // Treinamentos
  roteiro_treinamento: 2,
  certificado_treinamento: 1
};

module.exports = async function checkCredits(req, res, next) {
  try {
    const userId = req.user.id;
    const { document_key } = req.body;

    if (!document_key) {
      return res.status(400).json({
        error: 'document_key não informado'
      });
    }

    const cost = DOCUMENT_COST[document_key];

    if (!cost) {
      return res.status(400).json({
        error: 'document_key inválido'
      });
    }

    const { data: user, error } = await supabase
      .from('users_extra')
      .select('credits')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(403).json({
        error: 'Usuário sem perfil completo'
      });
    }

    if (user.credits < cost) {
      return res.status(402).json({
        error: 'Créditos insuficientes'
      });
    }

    // Disponibiliza info para o próximo handler
    req.documentCost = cost;
    req.documentKey = document_key;

    next();
  } catch (err) {
    console.error('ERRO MIDDLEWARE CRÉDITOS:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
};

