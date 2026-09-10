/* =========================================================
   Rotas/telegram.js — rota de webhook do Telegram para
   produção (Vercel). Diferente de Bot/telegram.js, que usa
   polling e só deve rodar localmente (npm run bot).
   ========================================================= */
const express = require('express');
const router = express.Router();
const TelegramBot = require('node-telegram-bot-api');
const { registrarComandos } = require('../Bot/Comandos');
const { aguardar } = require('../Bot/pendente');
const repo = require('../Repositorios/telegramRepositorio');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

let bot = null;

if (TOKEN) {
  // Sem { polling: true } — em modo webhook o Telegram nos envia
  // as atualizações via POST, não ficamos escutando ativamente.
  bot = new TelegramBot(TOKEN);
  registrarComandos(bot);
} else {
  console.error(
    '[Rotas/telegram] TELEGRAM_BOT_TOKEN não definido nas variáveis ' +
    'de ambiente da Vercel — rota de telegram vai responder 500.'
  );
}

router.post('/', async (req, res) => {
  if (!bot) {
    return res.status(500).json({ erro: 'Bot do Telegram não configurado.' });
  }
  // bot.processUpdate() dispara o handler (onText/callback_query) e volta
  // na hora, sem esperar ele terminar. Em serverless, se a gente responde
  // 200 antes do handler (que é async e mexe no Supabase) terminar, a
  // função pode ser encerrada no meio do caminho e a resposta pro usuário
  // nunca sai. Por isso esperamos aguardar() antes de responder.
  bot.processUpdate(req.body);
  await aguardar();
  res.sendStatus(200);
});

// POST /api/telegram/codigo — body: { usuarioId } — gera o código que a
// pessoa envia pro bot (/vincular <código>) pra vincular a própria conta.
router.post('/codigo', async function (req, res) {
  const { usuarioId } = req.body || {};
  if (!usuarioId) {
    return res.status(400).json({ erro: 'Informe o usuarioId.' });
  }
  try {
    const resultado = await repo.gerarCodigo(usuarioId);
    if (!resultado) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    res.json(resultado);
  } catch (err) {
    console.error('[telegram] erro ao gerar código:', err);
    res.status(500).json({ erro: 'Não foi possível gerar o código.' });
  }
});

// GET /api/telegram/status/:usuarioId — se a conta já está vinculada
router.get('/status/:usuarioId', async function (req, res) {
  try {
    const resultado = await repo.status(req.params.usuarioId);
    if (!resultado) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    res.json(resultado);
  } catch (err) {
    console.error('[telegram] erro ao consultar status:', err);
    res.status(500).json({ erro: 'Não foi possível consultar o status.' });
  }
});

// POST /api/telegram/desvincular — body: { usuarioId }
router.post('/desvincular', async function (req, res) {
  const { usuarioId } = req.body || {};
  if (!usuarioId) {
    return res.status(400).json({ erro: 'Informe o usuarioId.' });
  }
  try {
    const ok = await repo.desvincular(usuarioId);
    if (!ok) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    res.status(204).end();
  } catch (err) {
    console.error('[telegram] erro ao desvincular:', err);
    res.status(500).json({ erro: 'Não foi possível desvincular.' });
  }
});

module.exports = router;
