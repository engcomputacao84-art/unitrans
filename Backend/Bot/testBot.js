/* =========================================================
   testBot.js — testa se o TELEGRAM_BOT_TOKEN no .env é
   válido, sem precisar ligar o bot todo (sem polling).

   Rodar com:
     node Bot/testBot.js
   ========================================================= */

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TOKEN) {
  console.error('❌ Faltou configurar o .env (TELEGRAM_BOT_TOKEN).');
  process.exit(1);
}

// Sem { polling: true } aqui — só queremos fazer UMA chamada de
// teste (getMe), não ficar ouvindo mensagens.
const bot = new TelegramBot(TOKEN);

bot.getMe()
  .then(function (info) {
    console.log('✅ Conectado ao Telegram!');
    console.log('   Nome do bot: ' + info.first_name);
    console.log('   Usuário: @' + info.username);
    console.log('\nProcure por @' + info.username + ' no Telegram e mande /start pra testar de verdade.');
  })
  .catch(function (err) {
    console.error('❌ Token inválido ou sem conexão com a internet.');
    console.error('Detalhe do erro:', err.message);
  });
