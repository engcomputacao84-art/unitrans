const express = require('express');
const router = express.Router();
const repo = require('../Repositorios/paradasRepositorio');

// GET /api/paradas?cargaId=1&status=pendente
router.get('/', async function (req, res) {
  try {
    res.json(await repo.listar(req.query));
  } catch (err) {
    console.error('[paradas] erro ao listar:', err);
    res.status(500).json({ erro: 'Não foi possível carregar as paradas.' });
  }
});

router.get('/:id', async function (req, res) {
  try {
    const parada = await repo.buscarPorId(req.params.id);
    if (!parada) return res.status(404).json({ erro: 'Parada não encontrada.' });
    res.json(parada);
  } catch (err) {
    console.error('[paradas] erro ao buscar:', err);
    res.status(500).json({ erro: 'Não foi possível carregar a parada.' });
  }
});

// PATCH /api/paradas/:id/concluir  — usado pelo app do motorista
router.patch('/:id/concluir', async function (req, res) {
  try {
    res.json(await repo.marcarConcluida(req.params.id));
  } catch (err) {
    console.error('[paradas] erro ao concluir:', err);
    res.status(500).json({ erro: 'Não foi possível concluir a parada.' });
  }
});

// PATCH /api/paradas/:id/ocorrencia  — body: { tipo, descricao }
router.patch('/:id/ocorrencia', async function (req, res) {
  const { tipo, descricao } = req.body;
  if (!descricao) return res.status(400).json({ erro: 'Descreva a ocorrência.' });
  try {
    res.json(await repo.registrarOcorrencia(req.params.id, tipo || 'outro', descricao));
  } catch (err) {
    console.error('[paradas] erro ao registrar ocorrência:', err);
    res.status(500).json({ erro: 'Não foi possível registrar a ocorrência.' });
  }
});

module.exports = router;
