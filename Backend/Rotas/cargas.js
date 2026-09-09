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

// POST /api/cargas — passo 1 do wizard (dia + caminhão). Nasce em
// 'montagem', sem motorista — ver PATCH /:id/gerar-rota.
router.post('/', async function (req, res) {
  const dados = req.body;
  if (!dados.caminhaoId || !dados.data) {
    return res.status(400).json({ erro: 'Campos obrigatórios faltando (caminhaoId, data).' });
  }
  try {
    res.status(201).json(await repo.criar(dados));
  } catch (err) {
    console.error('[cargas] erro ao criar:', err);
    if (err.code === '23505') {
      return res.status(409).json({ erro: 'Este caminhão já tem uma carga nessa data.' });
    }
    res.status(500).json({ erro: 'Não foi possível criar a carga.' });
  }
});

// PATCH /api/cargas/:id/caminhao — troca o caminhão (só em 'montagem')
router.patch('/:id/caminhao', async function (req, res) {
  if (!req.body.caminhaoId) return res.status(400).json({ erro: 'Informe o caminhaoId.' });
  try {
    res.json(await repo.atualizarCaminhao(req.params.id, req.body.caminhaoId));
  } catch (err) {
    console.error('[cargas] erro ao atualizar caminhão:', err);
    if (err.code === '23505') {
      return res.status(409).json({ erro: 'Este caminhão já tem uma carga nessa data.' });
    }
    res.status(500).json({ erro: 'Não foi possível trocar o caminhão da carga.' });
  }
});

// PUT /api/cargas/:id/itens — body: { solicitacaoIds: [1,2,3] }
// Define a lista final de solicitações da carga (passo 2 do wizard e
// tela de editar). Reconcilia com o que já está gravado como paradas.
router.put('/:id/itens', async function (req, res) {
  const ids = req.body.solicitacaoIds;
  if (!Array.isArray(ids)) return res.status(400).json({ erro: 'Informe solicitacaoIds (array).' });
  try {
    res.json(await repo.definirItens(req.params.id, ids));
  } catch (err) {
    console.error('[cargas] erro ao definir itens:', err);
    res.status(500).json({ erro: 'Não foi possível atualizar as solicitações da carga.' });
  }
});

// PATCH /api/cargas/:id/gerar-rota — body: { motoristaId }
// Define o motorista e tira a carga de 'montagem' (vira 'pendente').
router.patch('/:id/gerar-rota', async function (req, res) {
  if (!req.body.motoristaId) return res.status(400).json({ erro: 'Informe o motoristaId.' });
  try {
    res.json(await repo.gerarRota(req.params.id, req.body.motoristaId));
  } catch (err) {
    console.error('[cargas] erro ao gerar rota:', err);
    if (err.code === 'CARGA_JA_TEM_ROTA') return res.status(409).json({ erro: err.message });
    if (err.code === '23505') {
      return res.status(409).json({ erro: 'Este motorista já tem uma carga nessa data.' });
    }
    res.status(500).json({ erro: 'Não foi possível gerar a rota.' });
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
    const carga = await repo.excluir(req.params.id);
    if (!carga) return res.status(404).json({ erro: 'Carga não encontrada.' });
    res.status(204).end();
  } catch (err) {
    console.error('[cargas] erro ao excluir:', err);
    res.status(500).json({ erro: 'Não foi possível excluir a carga.' });
  }
});

module.exports = router;
