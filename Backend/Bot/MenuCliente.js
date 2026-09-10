/* =========================================================
   MenuCliente.js — menu de botões (inline keyboard) do bot pro
   CLIENTE, navegado via callback_query. Espelha a estrutura de
   Menu.js (motorista), só que com as telas do cliente.
   ---------------------------------------------------------
   Igual ao menu do motorista nesta primeira versão: é só
   NAVEGAÇÃO + LEITURA (lista solicitações, mostra detalhes).
   Nada aqui grava no banco — "Nova Solicitação" e "Cancelar"
   ainda não têm formulário nem escrita real, só o botão (tela
   de "em construção"), igual "Relatar Problema" está hoje no
   menu do motorista.

   callback_data usa prefixo "c:" pra não colidir com os
   callbacks "m:" do menu do motorista.
   ========================================================= */
const { supabaseService: supabase } = require('../Banco/js/supabaseClient');
const solicitacoesRepo = require('../Repositorios/solicitacoesRepositorio');
const { marcar } = require('./pendente');

// Cada "aba" de Minhas Solicitações mapeia pra um (ou mais) status
// da tabela solicitacoes. "canceladas" ainda não existe como status
// no banco (ver schema.sql) — fica pronta pra quando o cancelamento
// de verdade for implementado; por enquanto a lista sempre vem vazia.
const CATEGORIAS = {
  analise:    { label: '🟡 Em análise',   status: 'pendente' },
  aprovadas:  { label: '🟢 Aprovadas',    status: 'aprovado' },
  andamento:  { label: '🔵 Em andamento', status: ['em_carga', 'em_rota'] },
  concluidas: { label: '✅ Concluídas',   status: 'concluido' },
  canceladas: { label: '❌ Canceladas',   status: 'cancelado' }
};

async function buscarClientePorChat(chatId) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, tipo')
    .eq('telegram_chat_id', chatId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.tipo !== 'C') return null;
  return data;
}

/* --------------------- telas (texto + teclado) --------------------- */

function telaPrincipal() {
  return {
    texto: '🏠 *Menu principal*\n\nO que você quer ver?',
    teclado: [
      [{ text: '📦 Solicitações', callback_data: 'c:solic' }],
      [{ text: '❓ Ajuda', callback_data: 'c:ajuda' }]
    ]
  };
}

function telaAjuda() {
  return {
    texto: '❓ *Ajuda*\n\nNossa equipe já foi avisada e vai te responder em breve!',
    teclado: [[{ text: '⬅️ Voltar', callback_data: 'c:home' }]]
  };
}

function telaSolicitacoes() {
  return {
    texto: '📦 *Solicitações*',
    teclado: [
      [{ text: '➕ Nova Solicitação', callback_data: 'c:solic:nova' }],
      [{ text: '📋 Minhas Solicitações', callback_data: 'c:solic:minhas' }],
      [{ text: '⬅️ Voltar', callback_data: 'c:home' }]
    ]
  };
}

function telaNovaSolicitacao() {
  return {
    texto: '➕ *Nova Solicitação*\n\nEssa função ainda está em construção — por enquanto não é possível criar uma solicitação por aqui. Use o site/app da Unitrans.',
    teclado: [[{ text: '⬅️ Voltar', callback_data: 'c:solic' }]]
  };
}

function telaMinhasSolicitacoes() {
  return {
    texto: '📋 *Minhas Solicitações*\n\nEscolha uma categoria:',
    teclado: [
      ...Object.entries(CATEGORIAS).map(([chave, cat]) => ([{ text: cat.label, callback_data: 'c:lista:' + chave }])),
      [{ text: '⬅️ Voltar', callback_data: 'c:solic' }]
    ]
  };
}

function formatarItemLista(s) {
  const partes = ['🚚 #' + s.id];
  if (s.dataDesejo) partes.push(s.dataDesejo);
  if (s.tipoCarga) partes.push(s.tipoCarga);
  return partes.join(' — ');
}

async function telaListaSolicitacoes(chave, clienteId) {
  const categoria = CATEGORIAS[chave];
  if (!categoria) {
    return { texto: 'Categoria não encontrada.', teclado: [[{ text: '⬅️ Voltar', callback_data: 'c:solic:minhas' }]] };
  }

  const solicitacoes = await solicitacoesRepo.listar({ clienteId, status: categoria.status });

  if (!solicitacoes.length) {
    return {
      texto: categoria.label + '\n\nVocê não tem nenhuma solicitação aqui.',
      teclado: [[{ text: '⬅️ Voltar', callback_data: 'c:solic:minhas' }]]
    };
  }

  const linhas = solicitacoes.map((s) => ([{
    text: formatarItemLista(s),
    callback_data: 'c:s:' + s.id + ':' + chave
  }]));
  linhas.push([{ text: '⬅️ Voltar', callback_data: 'c:solic:minhas' }]);

  return { texto: categoria.label + '\n\nSelecione uma solicitação:', teclado: linhas };
}

async function telaSolicitacaoSelecionada(id, chave) {
  const categoria = CATEGORIAS[chave];
  const solicitacao = await solicitacoesRepo.buscarPorId(id);
  const voltar = 'c:lista:' + chave;

  if (!solicitacao) {
    return { texto: 'Essa solicitação não existe mais.', teclado: [[{ text: '⬅️ Voltar', callback_data: voltar }]] };
  }

  const botoes = [[{ text: '👁️ Visualizar', callback_data: 'c:s:' + id + ':' + chave + ':ver' }]];
  // Cancelar só faz sentido enquanto a solicitação ainda está em análise.
  if (chave === 'analise') {
    botoes.push([{ text: '❌ Cancelar', callback_data: 'c:s:' + id + ':' + chave + ':cancelar' }]);
  }
  botoes.push([{ text: '⬅️ Voltar', callback_data: voltar }]);

  return {
    texto: '🚚 *Solicitação #' + solicitacao.id + '*\n' + (categoria ? categoria.label : ''),
    teclado: botoes
  };
}

async function telaSolicitacaoDetalhes(id, chave) {
  const solicitacao = await solicitacoesRepo.buscarPorId(id);
  const voltar = 'c:s:' + id + ':' + chave;

  if (!solicitacao) {
    return { texto: 'Essa solicitação não existe mais.', teclado: [[{ text: '⬅️ Voltar', callback_data: 'c:lista:' + chave }]] };
  }

  const texto =
    '👁️ *Detalhes da solicitação #' + solicitacao.id + '*\n\n' +
    '📌 Status: ' + solicitacao.status + '\n' +
    (solicitacao.dataDesejo ? '📅 Data desejada: ' + solicitacao.dataDesejo + '\n' : '') +
    (solicitacao.tipoCarga ? '📦 Tipo de carga: ' + solicitacao.tipoCarga + '\n' : '') +
    (solicitacao.peso ? '⚖️ Peso: ' + solicitacao.peso + ' kg\n' : '') +
    (solicitacao.volume ? '📐 Volume: ' + solicitacao.volume + ' m³\n' : '') +
    (solicitacao.enderecoColeta ? '📍 Coleta: ' + solicitacao.enderecoColeta + '\n' : '') +
    (solicitacao.enderecoEntrega ? '🏁 Entrega: ' + solicitacao.enderecoEntrega + '\n' : '') +
    (solicitacao.observacoes ? '📝 Observações: ' + solicitacao.observacoes + '\n' : '') +
    (solicitacao.motivoRecusa ? '⚠️ Motivo da recusa: ' + solicitacao.motivoRecusa + '\n' : '');

  return { texto, teclado: [[{ text: '⬅️ Voltar', callback_data: voltar }]] };
}

function telaCancelarSolicitacao(id, chave) {
  return {
    texto: '❌ *Cancelar solicitação #' + id + '*\n\nEssa função ainda está em construção — por enquanto não é possível cancelar por aqui. Use o site/app da Unitrans ou fale com a nossa equipe.',
    teclado: [[{ text: '⬅️ Voltar', callback_data: 'c:s:' + id + ':' + chave }]]
  };
}

/* --------------------- roteador do callback_query --------------------- */

async function resolverTela(dado, cliente) {
  const partes = dado.split(':'); // ex: ['c','s','12','analise','ver']

  if (dado === 'c:home') return telaPrincipal();
  if (dado === 'c:ajuda') return telaAjuda();
  if (dado === 'c:solic') return telaSolicitacoes();
  if (dado === 'c:solic:nova') return telaNovaSolicitacao();
  if (dado === 'c:solic:minhas') return telaMinhasSolicitacoes();

  if (partes[1] === 'lista') return telaListaSolicitacoes(partes[2], cliente.id);

  if (partes[1] === 's' && partes.length === 4) return telaSolicitacaoSelecionada(partes[2], partes[3]);
  if (partes[1] === 's' && partes[4] === 'ver') return telaSolicitacaoDetalhes(partes[2], partes[3]);
  if (partes[1] === 's' && partes[4] === 'cancelar') return telaCancelarSolicitacao(partes[2], partes[3]);

  return null;
}

// Manda o menu principal pro chat, se ele for de um cliente vinculado.
// Retorna true se mandou o menu, false se não é cliente (chamador decide
// o que fazer nesse caso). Reaproveitado pelo /menu e pelo /start.
async function enviarMenuPrincipal(bot, chatId) {
  const cliente = await buscarClientePorChat(chatId);
  if (!cliente) return false;

  const tela = telaPrincipal();
  await bot.sendMessage(chatId, tela.texto, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: tela.teclado } });
  return true;
}

// Registra só o roteador de callback_query (botões) do menu do cliente.
// O comando de texto /menu é centralizado em Comandos.js.
function registrarMenu(bot) {
  bot.on('callback_query', (query) => {
    const dado = query.data || '';
    if (!dado.startsWith('c:')) return; // não é um callback deste menu

    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;

    marcar((async () => {
      try {
        const cliente = await buscarClientePorChat(chatId);
        if (!cliente) {
          await bot.answerCallbackQuery(query.id, { text: 'Vincule sua conta primeiro (/vincular <código>).', show_alert: true });
          return;
        }

        const tela = await resolverTela(dado, cliente);
        if (!tela) {
          await bot.answerCallbackQuery(query.id);
          return;
        }

        await bot.editMessageText(tela.texto, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: tela.teclado }
        });
        await bot.answerCallbackQuery(query.id);
      } catch (err) {
        console.error('Erro ao navegar no menu do cliente:', err.message);
        await bot.answerCallbackQuery(query.id, { text: 'Deu um erro. Tenta de novo.', show_alert: true });
      }
    })());
  });
}

module.exports = { registrarMenu, enviarMenuPrincipal };
