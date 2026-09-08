const express = require('express');
const router = express.Router();
const repo = require('../Repositorios/cargasRepositorio');

router.get('/', async function (req, res) {
  try {
    res.json(await repo.listar(req.query));
  } catch (err) {
    console.error('[cargas] erro ao listar:', err);
    res.status(500).json({ erro: 'Não foi possível carregar as cargas.' });
  }
});

router.get('/:id', async function (req, res) {
  try {
    const carga = await repo.buscarPorId(req.params.id);
    if (!carga) return res.status(404).json({ erro: 'Carga não encontrada.' });
    res.json(carga);
  } catch (err) {
    console.error('[cargas] erro ao buscar:', err);
    res.status(500).json({ erro: 'Não foi possível carregar a carga.' });
  }
});

router.post('/', async function (req, res) {
  const dados = req.body;
  if (!dados.caminhaoId || !dados.motoristaId || !dados.data) {
    return res.status(400).json({ erro: 'Campos obrigatórios faltando (caminhaoId, motoristaId, data).' });
  }
  try {
    res.status(201).json(await repo.criar(dados));
  } catch (err) {
    console.error('[cargas] erro ao criar:', err);
    if (err.code === '23505') {
      return res.status(409).json({ erro: 'Este caminhão ou motorista já tem uma carga nessa data.' });
    }
    res.status(500).json({ erro: 'Não foi possível criar a carga.' });
  }
});

router.patch('/:id/status', async function (req, res) {
  try {
    res.json(await repo.atualizarStatus(req.params.id, req.body.status));
  } catch (err) {
    console.error('[cargas] erro ao atualizar status:', err);
    res.status(500).json({ erro: 'Não foi possível atualizar o status da carga.' });
  }
});

router.delete('/:id', async function (req, res) {
  try {
    await repo.excluir(req.params.id);
    res.status(204).end();
  } catch (err) {
    console.error('[cargas] erro ao excluir:', err);
    res.status(500).json({ erro: 'Não foi possível excluir a carga.' });
  }
});

module.exports = router;
