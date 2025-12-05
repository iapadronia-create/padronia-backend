const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

router.post('/complete-profile', async (req, res) => {
  try {
    const { access_token, device_id, profile } = req.body;

    if (!access_token || !device_id || !profile) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // 1. Validar token e obter usuário
    const { data: authData, error: authError } =
      await supabase.auth.getUser(access_token);

    if (authError || !authData?.user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const user_id = authData.user.id;

    // 2. Verificar se device já foi usado por outro usuário
    const { data: deviceUsed } = await supabase
      .from('users_extra')
      .select('*')
      .eq('device_id', device_id)
      .neq('id', user_id)
      .maybeSingle();

    if (deviceUsed) {
      return res.json({
        credits: 2,
        bonus: false,
        reason: "DEVICE_ALREADY_USED"
      });
    }

    // 3. Buscar dados atuais
    const { data: userExtra } = await supabase
      .from('users_extra')
      .select('*')
      .eq('id', user_id)
      .maybeSingle();

    const alreadyGotBonus = userExtra?.free_bonus_claimed === true;

    // 4. Atualizar perfil e liberar bônus se elegível
    const bonus = alreadyGotBonus ? false : true;

    const { error: updateError } = await supabase
      .from('users_extra')
      .upsert({
        id: user_id,
        device_id,
        area_atuacao: profile.area_atuacao,
        segmento: profile.segmento,
        objetivo: profile.objetivo,
        credits: bonus ? 2 : userExtra?.credits ?? 0,
        free_bonus_claimed: true
      });

    if (updateError) {
      console.log(updateError);
      return res.status(400).json({ error: "Update failed" });
    }

    return res.json({
      credits: bonus ? 2 : userExtra?.credits ?? 0,
      bonus
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
