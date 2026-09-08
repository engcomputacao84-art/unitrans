const express = require('express');
const router = express.Router();
const repo = require('../Repositorios/motoristasRepositorio');

router.get('/', async function (req, res) {
  try {
    res.json(await repo.listar());
  } catch (err) {
    console.error('[motoristas] erro ao listar:', err);
    res.status(500).json({ erro: 'Não foi possível carregar os motoristas.' });
  }
});

router.get('/:usuarioId', async function (req, res) {
  try {
    const motorista = await repo.buscarPorId(req.params.usuarioId);
    if (!motorista) return res.status(404).json({ erro: 'Motorista não encontrado.' });
    res.json(motorista);
  } catch (err) {
    console.error('[motoristas] erro ao buscar:', err);
    res.status(500).json({ erro: 'Não foi possível carregar o motorista.' });
  }
});

router.post('/', async function (req, res) {
  const dados = req.body;
  if (!dados.nome || !dados.cpf || !dados.cnhNumero || !dados.cnhValidade) {
    return res.status(400).json({ erro: 'Campos obrigatórios faltando (nome, cpf, cnhNumero, cnhValidade).' });
  }
  try {
    const motorista = await repo.criar(dados);
    res.status(201).json(motorista);
  } catch (err) {
    console.error('[motoristas] erro ao criar:', err);
    if (err.code === '23505') return res.status(409).json({ erro: 'Já existe um motorista com este CPF.' });
    res.status(500).json({ erro: 'Não foi possível cadastrar o motorista.' });
  }
});

router.put('/:usuarioId', async function (req, res) {
  try {
    const motorista = await repo.atualizar(req.params.usuarioId, req.body);
    if (!motorista) return res.status(404).json({ erro: 'Motorista não encontrado.' });
    res.json(motorista);
  } catch (err) {
    console.error('[motoristas] erro ao atualizar:', err);
    res.status(500).json({ erro: 'Não foi possível atualizar o motorista.' });
  }
});

router.delete('/:usuarioId', async function (req, res) {
  try {
    await repo.excluir(req.params.usuarioId);
    res.status(204).end();
  } catch (err) {
    console.error('[motoristas] erro ao excluir:', err);
    res.status(500).json({ erro: 'Não foi possível excluir o motorista.' });
  }
});

module.exports = router;
