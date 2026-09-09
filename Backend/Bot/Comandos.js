/* =========================================================
   comandos.js — comandos do bot da Unitrans, separados da
   forma de conexão (polling local vs webhook na Vercel), pra
   não duplicar a lógica nos dois lugares que usam o bot.
   ========================================================= */
const { supabaseService: supabase } = require('../Banco/js/supabaseClient');

function registrarComandos(bot) {
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
}

module.exports = { registrarComandos };
