const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  return res.json({
    success: true,
    message: "Acesso permitido! Usuário autenticado.",
    user: req.user
  });
});

module.exports = router;
