const express = require('express');
const router = express.Router();
const repo = require('../Repositorios/caminhoesRepositorio');

router.get('/', async function (req, res) {
  try {
    res.json(await repo.listar());
  } catch (err) {
    console.error('[caminhoes] erro ao listar:', err);
    res.status(500).json({ erro: 'Não foi possível carregar os caminhões.' });
  }
});

router.get('/:placa', async function (req, res) {
  try {
    const caminhao = await repo.buscarPorId(req.params.placa.toUpperCase());
    if (!caminhao) return res.status(404).json({ erro: 'Caminhão não encontrado.' });
    res.json(caminhao);
  } catch (err) {
    console.error('[caminhoes] erro ao buscar:', err);
    res.status(500).json({ erro: 'Não foi possível carregar o caminhão.' });
  }
});

router.post('/', async function (req, res) {
  const dados = req.body;
  if (!dados.id || !dados.marca || !dados.modelo || !dados.tipo) {
    return res.status(400).json({ erro: 'Campos obrigatórios faltando (placa, marca, modelo, tipo).' });
  }
  try {
    const caminhao = await repo.criar(dados);
    res.status(201).json(caminhao);
  } catch (err) {
    console.error('[caminhoes] erro ao criar:', err);
    if (err.code === '23505') return res.status(409).json({ erro: 'Já existe um caminhão com esta placa ou RENAVAM.' });
    res.status(500).json({ erro: 'Não foi possível cadastrar o caminhão.' });
  }
});

router.put('/:placa', async function (req, res) {
  try {
    const caminhao = await repo.atualizar(req.params.placa.toUpperCase(), req.body);
    res.json(caminhao);
  } catch (err) {
    console.error('[caminhoes] erro ao atualizar:', err);
    res.status(500).json({ erro: 'Não foi possível atualizar o caminhão.' });
  }
});

router.patch('/:placa/status', async function (req, res) {
  try {
    const caminhao = await repo.atualizarStatus(req.params.placa.toUpperCase(), req.body.status);
    res.json(caminhao);
  } catch (err) {
    console.error('[caminhoes] erro ao atualizar status:', err);
    res.status(500).json({ erro: 'Não foi possível atualizar o status do caminhão.' });
  }
});

router.delete('/:placa', async function (req, res) {
  try {
    await repo.excluir(req.params.placa.toUpperCase());
    res.status(204).end();
  } catch (err) {
    console.error('[caminhoes] erro ao excluir:', err);
    res.status(500).json({ erro: 'Não foi possível excluir o caminhão.' });
  }
});

module.exports = router;
