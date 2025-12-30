const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Cliente apenas para validação de token (ANON KEY)
const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não informado.' });
    }

    const accessToken = authHeader.replace('Bearer ', '');

    // Valida token
    const { data, error } = await supabaseAuth.auth.getUser(accessToken);

    if (error || !data || !data.user) {
      return res.status(401).json({ error: 'Token inválido.' });
    }

    // GARANTIA: sempre teremos o ID
    req.user = {
      id: data.user.id,
      email: data.user.email
    };

    next();
  } catch (err) {
    console.error('Erro de autenticação:', err);
    return res.status(500).json({ error: 'Erro interno na autenticação.' });
  }
};


