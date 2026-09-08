const express = require('express');
const router = express.Router();
const repo = require('../Repositorios/notificacoesRepositorio');

// GET /api/notificacoes/pendentes — usado pelo bot/worker que envia
router.get('/pendentes', async function (req, res) {
  try {
    res.json(await repo.listarPendentes());
  } catch (err) {
    console.error('[notificacoes] erro ao listar pendentes:', err);
    res.status(500).json({ erro: 'Não foi possível carregar as notificações pendentes.' });
  }
});

// GET /api/notificacoes/usuario/:usuarioId — histórico de um usuário
router.get('/usuario/:usuarioId', async function (req, res) {
  try {
    res.json(await repo.listarPorUsuario(req.params.usuarioId));
  } catch (err) {
    console.error('[notificacoes] erro ao listar por usuário:', err);
    res.status(500).json({ erro: 'Não foi possível carregar as notificações.' });
  }
});

// PATCH /api/notificacoes/:id/enviada — body opcional: { erro }
router.patch('/:id/enviada', async function (req, res) {
  try {
    await repo.marcarEnviada(req.params.id, req.body ? req.body.erro : null);
    res.status(204).end();
  } catch (err) {
    console.error('[notificacoes] erro ao marcar enviada:', err);
    res.status(500).json({ erro: 'Não foi possível atualizar a notificação.' });
  }
});

module.exports = router;
