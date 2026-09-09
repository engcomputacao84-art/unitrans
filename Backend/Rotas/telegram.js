/* =========================================================
   Rotas/telegram.js — rota de webhook do Telegram para
   produção (Vercel). Diferente de Bot/telegram.js, que usa
   polling e só deve rodar localmente (npm run bot).
   ========================================================= */
const express = require('express');
const router = express.Router();
const TelegramBot = require('node-telegram-bot-api');
const { registrarComandos } = require('../Bot/Comandos');

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

router.post('/', (req, res) => {
  if (!bot) {
    return res.status(500).json({ erro: 'Bot do Telegram não configurado.' });
  }
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

module.exports = router;
