const express = require('express');
const router = express.Router();

router.post('/kiwify', async (req, res) => {
  console.log("Webhook recebido:", req.body);
  return res.status(200).send("OK");
});

module.exports = router;
