const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Cria cliente do Supabase usando a service role (apenas no backend)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Função auxiliar para validar o token do Supabase e obter o usuário
async function getUserFromToken(accessToken) {
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) {
    throw new Error('Token inválido');
  }
  return data.user;
}

// Rota POST /api/complete-profile
router.post('/', async (req, res) => {
  try {
    const { access_token, profile, device_id } = req.body;

    // Validação básica dos campos
    if (!access_token || !device_id || !profile) {
      return res.status(400).json({ error: 'Dados insuficientes' });
    }

    // 1. Validar token e obter o usuário
    const user = await getUserFromToken(access_token);
    const userId = user.id;

    // 2. Buscar registro atual na tabela users_extra
    const { data: existingProfile, error: selectError } = await supabase
      .from('users_extra')
      .select('*')
      .eq('id', userId)
      .single();

    // 3. Se não existir registro, inserir um novo
    if (selectError && selectError.code === 'PGRST116') {
      await supabase.from('users_extra').insert({
        id: userId,
        area_atuacao: profile.area_atuacao,
        segmento: profile.segmento,
        objetivo: profile.objetivo,
        credits: 0,
        free_bonus_claimed: false,
        device_id: null
      });
    } else {
      // Se já existir, apenas atualiza o perfil (sem mexer ainda nos créditos)
      await supabase
        .from('users_extra')
        .update({
          area_atuacao: profile.area_atuacao,
          segmento: profile.segmento,
          objetivo: profile.objetivo
        })
        .eq('id', userId);
    }

    // 4. Buscar perfil atualizado
    const { data: dbProfile } = await supabase
      .from('users_extra')
      .select('*')
      .eq('id', userId)
      .single();

    // 5. Verificar se o device já foi usado por outro usuário
    const { data: deviceOwner } = await supabase
      .from('users_extra')
      .select('id')
      .eq('device_id', device_id)
      .maybeSingle();

    if (deviceOwner && deviceOwner.id !== userId) {
      // Outro usuário já usou esse device_id – não dá bônus
      return res.json({
        credits: dbProfile.credits,
        bonus: false,
        reason: 'DEVICE_ALREADY_USED'
      });
    }

    // 6. Se ainda NÃO ganhou bônus, concede 2 créditos
    if (!dbProfile.free_bonus_claimed) {
      const newCredits = (dbProfile.credits || 0) + 2;

      await supabase
        .from('users_extra')
        .update({
          credits: newCredits,
          free_bonus_claimed: true,
          device_id: device_id
        })
        .eq('id', userId);

      return res.json({
        credits: newCredits,
        bonus: true
      });
    }

    // 7. Se já tinha ganho antes, só retorna o saldo atual, sem bônus
    return res.json({
      credits: dbProfile.credits,
      bonus: false
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

module.exports = router;

