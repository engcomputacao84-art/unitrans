

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const clientesRotas = require('./Rotas/clientes');
const motoristasRotas = require('./Rotas/motoristas');
const caminhoesRotas = require('./Rotas/caminhoes');
const cargasRotas = require('./Rotas/cargas');
const solicitacoesRotas = require('./Rotas/solicitacoes');
const paradasRotas = require('./Rotas/paradas');
const notificacoesRotas = require('./Rotas/notificacoes');
const authRotas = require('./Rotas/auth');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', function (req, res) {
  res.json({ ok: true, servico: 'unitrans-api' });
});

app.use('/api/auth', authRotas);
app.use('/api/clientes', clientesRotas);
app.use('/api/motoristas', motoristasRotas);
app.use('/api/caminhoes', caminhoesRotas);
app.use('/api/cargas', cargasRotas);
app.use('/api/solicitacoes', solicitacoesRotas);
app.use('/api/paradas', paradasRotas);
app.use('/api/notificacoes', notificacoesRotas);

app.use(function (req, res) {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

// Handler de erro genérico (caso algum middleware chame next(err)).
app.use(function (err, req, res, next) {
  console.error('[server] erro não tratado:', err);
  res.status(500).json({ erro: 'Erro interno no servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, function () {
  console.log('Unitrans API rodando em http://localhost:' + PORT);
});
