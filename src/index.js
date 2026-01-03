require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

// ==============================
// MIDDLEWARES OBRIGATÓRIOS
// ==============================
app.use(cors());

// ISSO É O QUE ESTAVA FALTANDO
app.use(express.json());

// (opcional, mas seguro)
app.use(express.urlencoded({ extended: true }));

// ==============================
// ROTAS
// ==============================
const generateRoute = require("./routes/generate");
const meRoute = require("./routes/me");
const completeProfileRoute = require("./routes/completeProfile");

app.use("/api", generateRoute);
app.use("/api", meRoute);
app.use("/api", completeProfileRoute);

// ==============================
// HEALTH CHECK
// ==============================
app.get("/", (req, res) => {
  res.send("PadronIA Backend OK");
});

// ==============================
// START SERVER
// ==============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

