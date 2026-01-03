const axios = require("axios");
const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

// ==============================
// Supabase (service role)
// ==============================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ==============================
// CONFIG N8N
// ==============================
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
// exemplo esperado:
// https://webhook.padronia.com/webhook/padronia/generate

// ==============================
// POST /api/generate
// ==============================
router.post("/generate", async (req, res) => {
  try {
    // --------------------------------
    // 1. AUTH — token do usuário
    // --------------------------------
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token não informado." });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Token inválido." });
    }

    const userId = user.id;

    // --------------------------------
    // 2. BODY
    // --------------------------------
    const { document_key, description, extra_context } = req.body;

    if (!document_key) {
      return res.status(400).json({ error: "document_key não informado" });
    }

    if (!description) {
      return res.status(400).json({ error: "description não informada" });
    }

    // --------------------------------
    // 3. Buscar créditos
    // --------------------------------
    const { data: profile, error: profileError } = await supabase
      .from("users_extra")
      .select("credits_base, credits_extra")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return res
        .status(500)
        .json({ error: "Erro ao carregar créditos do usuário." });
    }

    let { credits_base, credits_extra } = profile;
    const TOTAL_CREDITS = credits_base + credits_extra;

    if (TOTAL_CREDITS <= 0) {
      return res.status(402).json({
        error: "Créditos insuficientes",
        code: "NO_CREDITS",
      });
    }

    // --------------------------------
    // 4. Custo por documento
    // --------------------------------
    const DOCUMENT_COSTS = {
      pop_higienizacao: 2,
      pop_padrao: 2,
      checklist_bpf: 1,
      ficha_tecnica: 1,
      relatorio_nc: 2,
    };

    const cost = DOCUMENT_COSTS[document_key];

    if (!cost) {
      return res.status(400).json({
        error: "document_key inválido ou não suportado",
      });
    }

    if (TOTAL_CREDITS < cost) {
      return res.status(402).json({
        error: "Créditos insuficientes para este documento",
        required: cost,
        available: TOTAL_CREDITS,
      });
    }

    // --------------------------------
    // 5. Consumir créditos
    // --------------------------------
    let newBase = credits_base;
    let newExtra = credits_extra;

    if (credits_base >= cost) {
      newBase -= cost;
    } else {
      const remaining = cost - credits_base;
      newBase = 0;
      newExtra -= remaining;
    }

    const { error: updateCreditsError } = await supabase
      .from("users_extra")
      .update({
        credits_base: newBase,
        credits_extra: newExtra,
      })
      .eq("id", userId);

    if (updateCreditsError) {
      return res
        .status(500)
        .json({ error: "Erro ao atualizar créditos." });
    }

    // --------------------------------
// 6. CHAMADA AO N8N (PONTO CRÍTICO)
// --------------------------------
let n8nResponse;

try {
  n8nResponse = await axios.post(
    process.env.N8N_WEBHOOK_URL,
    {
      document_key,
      description,
      extra_context,
      user_id: userId,
    },
    {
      headers: {
  "Content-Type": "application/json",
  "x-padronia-secret": process.env.N8N_SECRET,
    },
      timeout: 60000,
    }
  );


} catch (err) {
  console.error(
    "Erro ao chamar n8n:",
    err.response?.data || err.message
  );

  return res.status(502).json({
    error: "Erro ao gerar documento via n8n",
    details: err.response?.data || err.message,
  });
}

// --------------------------------
// 7. EXTRAÇÃO DO TEXTO GERADO
// --------------------------------
const raw = n8nResponse.data;

const text = raw?.output?.[0]?.content?.[0]?.text;

if (!text) {
  return res.status(502).json({
    error: "Resposta inválida do serviço de geração (n8n)",
    raw,
  });
}

// --------------------------------
// 8. DOCUMENTO FINAL
// --------------------------------
const generatedDocument = {
  title: document_key,
  content: text,
};

// --------------------------------
// 9. RESPOSTA FINAL
// --------------------------------
return res.status(200).json({
  success: true,
  document_key,
  cost,
  credits_remaining: {
    base: newBase,
    extra: newExtra,
    total: newBase + newExtra,
  },
  document: generatedDocument,
});

  } catch (err) {
    console.error("Erro em /api/generate:", err);
    return res.status(500).json({
      error: "Erro interno ao gerar documento",
    });
  }
});

module.exports = router;
