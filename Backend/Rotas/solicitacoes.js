const express = require('express');
const router = express.Router();
const repo = require('../Repositorios/solicitacoesRepositorio');

// GET /api/solicitacoes?status=pendente&clienteId=6
router.get('/', async function (req, res) {
  try {
    res.json(await repo.listar(req.query));
  } catch (err) {
    console.error('[solicitacoes] erro ao listar:', err);
    res.status(500).json({ erro: 'Não foi possível carregar as solicitações.' });
  }
});

router.get('/:id', async function (req, res) {
  try {
    const solicitacao = await repo.buscarPorId(req.params.id);
    if (!solicitacao) return res.status(404).json({ erro: 'Solicitação não encontrada.' });
    res.json(solicitacao);
  } catch (err) {
    console.error('[solicitacoes] erro ao buscar:', err);
    res.status(500).json({ erro: 'Não foi possível carregar a solicitação.' });
  }
});

// POST /api/solicitacoes — body precisa de clienteId + o resto dos dados
router.post('/', async function (req, res) {
  const { clienteId, ...dados } = req.body;
  if (!clienteId || !dados.coleta || !dados.entrega) {
    return res.status(400).json({ erro: 'Campos obrigatórios faltando (clienteId, coleta, entrega).' });
  }
  try {
    res.status(201).json(await repo.criar(clienteId, dados));
  } catch (err) {
    console.error('[solicitacoes] erro ao criar:', err);
    res.status(500).json({ erro: 'Não foi possível registrar a solicitação.' });
  }
});

// PATCH /api/solicitacoes/:id/aprovar — body: { analistaId }
router.patch('/:id/aprovar', async function (req, res) {
  try {
    res.json(await repo.aprovar(req.params.id, req.body.analistaId));
  } catch (err) {
    console.error('[solicitacoes] erro ao aprovar:', err);
    res.status(500).json({ erro: 'Não foi possível aprovar a solicitação.' });
  }
});

// PATCH /api/solicitacoes/:id/recusar — body: { analistaId, motivo }
router.patch('/:id/recusar', async function (req, res) {
  if (!req.body.motivo) return res.status(400).json({ erro: 'Informe o motivo da recusa.' });
  try {
    res.json(await repo.recusar(req.params.id, req.body.analistaId, req.body.motivo));
  } catch (err) {
    console.error('[solicitacoes] erro ao recusar:', err);
    res.status(500).json({ erro: 'Não foi possível recusar a solicitação.' });
  }
});

module.exports = router;
