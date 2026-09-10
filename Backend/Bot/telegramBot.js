/* =========================================================
   telegramBot.js — roda o bot LOCALMENTE via polling.
   Use com: npm run bot
   Não é isso que roda em produção na Vercel — lá quem cuida
   é Rotas/telegram.js, via webhook (ver Rotas/telegram.js).
   ========================================================= */
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { registrarComandos } = require('./Comandos');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TOKEN) {
  throw new Error(
    'Bot do Telegram não configurado. Defina TELEGRAM_BOT_TOKEN no arquivo .env ' +
    '(veja Backend/.env.example).'
  );
}

const bot = new TelegramBot(TOKEN, { polling: true });

registrarComandos(bot);

bot.on('polling_error', (err) => {
  console.error('Erro de polling do Telegram:', err.message);
});

console.log('🤖 Bot da Unitrans rodando localmente (polling)...');

module.exports = bot;
