require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { supabaseService: supabase } = require('../Banco/js/supabaseClient');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TOKEN) {
  throw new Error(
    'Bot do Telegram não configurado. Defina TELEGRAM_BOT_TOKEN no arquivo .env ' +
    '(veja Backend/.env.example).'
  );
}

const bot = new TelegramBot(TOKEN, { polling: true });

console.log('🤖 Bot da Unitrans rodando...');

/* ---------- Comandos básicos ---------- */

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    'Olá! 🚚 Sou o bot da Unitrans.\n\n' +
    'Comandos disponíveis:\n' +
    '/status <código> — consultar o status de uma solicitação\n' +
    '/ajuda — falar com a nossa equipe'
  );
});

bot.onText(/\/ajuda/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Nossa equipe já foi avisada e vai te responder em breve!');
});

// Exemplo: /status SOL-0001 -> busca no Supabase e responde.
bot.onText(/\/status (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const codigo = match[1].trim();

  try {
    const { data, error } = await supabase
      .from('solicitacoes')
      .select('*')
      .eq('id', codigo)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      bot.sendMessage(chatId, 'Não encontrei nenhuma solicitação com o código "' + codigo + '".');
      return;
    }

    bot.sendMessage(chatId, 'Solicitação ' + data.id + ': ' + (data.status || 'sem status') + '.');
  } catch (err) {
    console.error('Erro ao consultar status:', err.message);
    bot.sendMessage(chatId, 'Deu um erro ao consultar. Tenta de novo em instantes.');
  }
});

// Log simples de qualquer mensagem recebida (útil pra debugar).
bot.on('message', (msg) => {
  console.log('Mensagem de ' + (msg.from.username || msg.from.id) + ': ' + (msg.text || '[não é texto]'));
});

bot.on('polling_error', (err) => {
  console.error('Erro de polling do Telegram:', err.message);
});

module.exports = bot;