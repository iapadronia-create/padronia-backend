const pool = require('../db');

module.exports = async function (req, res, next) {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      "SELECT credits FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado.' });
    }

    const credits = result.rows[0].credits;

    if (credits <= 0) {
      return res.status(403).json({ error: 'Créditos insuficientes.' });
    }

    req.user.credits = credits;
    next();

  } catch (err) {
    console.error("Erro ao validar créditos:", err);
    return res.status(500).json({ error: 'Erro ao validar créditos.' });
  }
};
