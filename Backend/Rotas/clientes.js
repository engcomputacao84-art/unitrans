/* =========================================================
   Rotas de CLIENTES
   ---------------------------------------------------------
   Só validação de entrada + status HTTP. A lógica de banco
   fica inteira em Repositorios/clientesRepositorio.js.
   ========================================================= */

const express = require('express');
const router = express.Router();
const repo = require('../Repositorios/clientesRepositorio');

// GET /api/clientes
router.get('/', async function (req, res) {
  try {
    const clientes = await repo.listar();
    res.json(clientes);
  } catch (err) {
    console.error('[clientes] erro ao listar:', err);
    res.status(500).json({ erro: 'Não foi possível carregar os clientes.' });
  }
});

// GET /api/clientes/:usuarioId
router.get('/:usuarioId', async function (req, res) {
  try {
    const cliente = await repo.buscarPorId(req.params.usuarioId);
    if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado.' });
    res.json(cliente);
  } catch (err) {
    console.error('[clientes] erro ao buscar:', err);
    res.status(500).json({ erro: 'Não foi possível carregar o cliente.' });
  }
});

// POST /api/clientes
router.post('/', async function (req, res) {
  const dados = req.body;
  if (!dados.tipo || !dados.nome || !dados.documento || !dados.cidade || !dados.uf) {
    return res.status(400).json({ erro: 'Campos obrigatórios faltando (tipo, nome, documento, cidade, uf).' });
  }
  try {
    const cliente = await repo.criar(dados);
    res.status(201).json(cliente);
  } catch (err) {
    console.error('[clientes] erro ao criar:', err);
    if (err.code === '23505') { // unique_violation (email ou documento repetido)
      return res.status(409).json({ erro: 'Já existe um cliente com este e-mail ou documento.' });
    }
    res.status(500).json({ erro: 'Não foi possível cadastrar o cliente.' });
  }
});

// PUT /api/clientes/:usuarioId
router.put('/:usuarioId', async function (req, res) {
  try {
    const cliente = await repo.atualizar(req.params.usuarioId, req.body);
    if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado.' });
    res.json(cliente);
  } catch (err) {
    console.error('[clientes] erro ao atualizar:', err);
    res.status(500).json({ erro: 'Não foi possível atualizar o cliente.' });
  }
});

// DELETE /api/clientes/:usuarioId
router.delete('/:usuarioId', async function (req, res) {
  try {
    await repo.excluir(req.params.usuarioId);
    res.status(204).end();
  } catch (err) {
    console.error('[clientes] erro ao excluir:', err);
    res.status(500).json({ erro: 'Não foi possível excluir o cliente.' });
  }
});

module.exports = router;
