const express = require('express');
const router = express.Router();
const repo = require('../Repositorios/authRepositorio');

// POST /api/auth/login — body: { email, senha }
router.post('/login', async function (req, res) {
  const { email, senha } = req.body || {};
  if (!email || !senha) {
    return res.status(400).json({ erro: 'Informe e-mail e senha.' });
  }
  try {
    const usuario = await repo.login(email, senha);
    if (!usuario) {
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    }
    res.json(usuario);
  } catch (err) {
    console.error('[auth] erro ao autenticar:', err);
    res.status(500).json({ erro: 'Não foi possível autenticar. Tente novamente.' });
  }
});

module.exports = router;
