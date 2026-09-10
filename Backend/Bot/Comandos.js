/* =========================================================
   comandos.js — comandos do bot da Unitrans, separados da
   forma de conexão (polling local vs webhook na Vercel), pra
   não duplicar a lógica nos dois lugares que usam o bot.
   ========================================================= */
const { supabaseService: supabase } = require('../Banco/js/supabaseClient');
const { registrarMenu } = require('./Menu');

function registrarComandos(bot) {
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('id')
        .eq('telegram_chat_id', chatId)
        .maybeSingle();
      if (error) throw error;

      const vinculado = !!usuario;

      const mensagem = vinculado
        ? 'Olá de novo! 🚚 Sua conta já está vinculada.\n\n' +
          'Comandos disponíveis:\n' +
          '/menu — abrir o menu\n' +
          '/ajuda — falar com a nossa equipe'
        : 'Olá! 🚚 Sou o bot da Unitrans.\n\n' +
          'Comandos disponíveis:\n' +
          '/vincular <código> — vincular esta conversa à sua conta (gere o código na tela "Telegram" do sistema)\n' +
          '/ajuda — falar com a nossa equipe';

      bot.sendMessage(chatId, mensagem);
    } catch (err) {
      console.error('Erro ao checar vínculo no /start:', err.message);
      bot.sendMessage(
        chatId,
        'Olá! 🚚 Sou o bot da Unitrans.\n\n' +
        'Comandos disponíveis:\n' +
        '/vincular <código> — vincular esta conversa à sua conta\n' +
        '/ajuda — falar com a nossa equipe'
      );
    }
  });

  registrarMenu(bot);

  bot.onText(/\/ajuda/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Nossa equipe já foi avisada e vai te responder em breve!');
  });

  // /vincular <código> — confirma o código gerado pela pessoa no site
  // (POST /api/telegram/codigo) e grava o chat_id em usuarios.telegram_chat_id.
  bot.onText(/\/vincular(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const codigo = (match[1] || '').trim().toUpperCase();

    if (!codigo) {
      bot.sendMessage(chatId, 'Envie o comando junto com o código gerado no site, assim: /vincular ABC123');
      return;
    }

    try {
      const { data: usuario, error: erroBusca } = await supabase
        .from('usuarios')
        .select('id, nome, telegram_link_expira')
        .eq('telegram_link_token', codigo)
        .maybeSingle();

      if (erroBusca) throw erroBusca;

      if (!usuario) {
        bot.sendMessage(chatId, 'Código inválido. Gere um novo código na tela "Telegram" do sistema e tente de novo.');
        return;
      }

      const expirado = !usuario.telegram_link_expira || new Date(usuario.telegram_link_expira) < new Date();
      if (expirado) {
        bot.sendMessage(chatId, 'Esse código expirou. Gere um novo na tela "Telegram" do sistema.');
        return;
      }

      const { error: erroUpdate } = await supabase
        .from('usuarios')
        .update({
          telegram_chat_id: chatId,
          telegram_link_token: null,
          telegram_link_expira: null,
          telegram_vinculado_em: new Date().toISOString()
        })
        .eq('id', usuario.id);

      if (erroUpdate) {
        // 23505 = unique_violation: esse chat do Telegram já está vinculado a outra conta.
        if (erroUpdate.code === '23505') {
          bot.sendMessage(chatId, 'Este Telegram já está vinculado a outra conta da Unitrans.');
          return;
        }
        throw erroUpdate;
      }

      const nome = usuario.nome ? ', ' + usuario.nome : '';
      bot.sendMessage(chatId, '✅ Conta vinculada com sucesso' + nome + '! A partir de agora você recebe seus avisos por aqui.');
    } catch (err) {
      console.error('Erro ao vincular Telegram:', err.message);
      bot.sendMessage(chatId, 'Deu um erro ao vincular. Tenta de novo em instantes.');
    }
  });

  // Log simples de qualquer mensagem recebida (útil pra debugar).
  bot.on('message', (msg) => {
    console.log('Mensagem de ' + (msg.from.username || msg.from.id) + ': ' + (msg.text || '[não é texto]'));
  });
}

module.exports = { registrarComandos };
