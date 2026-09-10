/* ---------------------------------------------------------
   Menu.js — menu de botões (inline keyboard) do bot pro
   MOTORISTA, navegado via callback_query.
   ---------------------------------------------------------
   Nesta primeira versão é só NAVEGAÇÃO + LEITURA:
     - lista cargas do dia, detalhes, pontos da rota, etc.
     - NADA aqui grava no banco (nem marcar ponto, nem
       relatar problema de verdade) — isso fica pra depois.

   callback_data usa prefixo "m:" pra não colidir com outros
   callbacks que o bot possa vir a ter no futuro.
   --------------------------------------------------------- */
const { supabaseService: supabase } = require('../Banco/js/supabaseClient');
const cargasRepo = require('../Repositorios/cargasRepositorio');
const paradasRepo = require('../Repositorios/paradasRepositorio');
const { marcar } = require('./pendente');

const ICONE_TIPO = { coleta: '📦', entrega: '🏁' };
const ICONE_STATUS_PARADA = { pendente: '⬜', concluida: '✅', ocorrencia: '⚠️' };

function hojeISO() {
  // data local (America/Sao_Paulo), não UTC, pra "hoje" bater com o
  // que a equipe vê na tela — mesmo critério usado no resto do app.
  const agora = new Date();
  const offsetMs = agora.getTimezoneOffset() * 60000;
  return new Date(agora.getTime() - offsetMs).toISOString().slice(0, 10);
}

async function buscarMotoristaPorChat(chatId) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, tipo')
    .eq('telegram_chat_id', chatId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.tipo !== 'M') return null;
  return data;
}

// Carga "ativa" da rota pra fins do menu ROTA: a mais recente que
// ainda não terminou (pendente ou andamento). Se tiver mais de uma
// (não deveria, hoje é 1 por dia), pega a mais recente.
async function buscarCargaAtiva(motoristaId) {
  const cargas = await cargasRepo.listar({ motoristaId });
  const ativas = cargas.filter((c) => c.status === 'pendente' || c.status === 'andamento');
  return ativas[0] || null;
}

/* --------------------- telas (texto + teclado) --------------------- */

function telaPrincipal() {
  return {
    texto: '🏠 *Menu principal*\n\nO que você quer ver?',
    teclado: [
      [{ text: '📦 Cargas', callback_data: 'm:cargas' }],
      [{ text: '🛣️ Rota', callback_data: 'm:rota' }],
      [{ text: '❓ Ajuda', callback_data: 'm:ajuda' }]
    ]
  };
}

function telaAjuda() {
  return {
    texto: '❓ *Ajuda*\n\nNossa equipe já foi avisada e vai te responder em breve!',
    teclado: [[{ text: '⬅️ Voltar', callback_data: 'm:home' }]]
  };
}

function telaCargas() {
  return {
    texto: '📦 *Cargas*',
    teclado: [
      [{ text: '📅 Cargas do Dia', callback_data: 'm:cargas:dia' }],
      [{ text: '⬅️ Voltar', callback_data: 'm:home' }]
    ]
  };
}

async function telaCargasDoDia(motoristaId) {
  const cargas = await cargasRepo.listar({ motoristaId, data: hojeISO() });

  if (!cargas.length) {
    return {
      texto: '📅 *Cargas do Dia*\n\nVocê não tem nenhuma carga pra hoje.',
      teclado: [[{ text: '⬅️ Voltar', callback_data: 'm:cargas' }]]
    };
  }

  const linhas = cargas.map((c) => ([{
    text: '🚚 Carga #' + c.id + ' — ' + c.caminhaoLabel,
    callback_data: 'm:carga:' + c.id
  }]));
  linhas.push([{ text: '⬅️ Voltar', callback_data: 'm:cargas' }]);

  return { texto: '📅 *Cargas do Dia*\n\nSelecione uma carga:', teclado: linhas };
}

async function telaCargaSelecionada(cargaId) {
  const carga = await cargasRepo.buscarPorId(cargaId);
  if (!carga) {
    return { texto: 'Essa carga não existe mais.', teclado: [[{ text: '⬅️ Voltar', callback_data: 'm:cargas:dia' }]] };
  }
  return {
    texto: '🚚 *Carga #' + carga.id + '*\n' + carga.caminhaoLabel,
    teclado: [
      [{ text: '👁️ Visualizar detalhes', callback_data: 'm:carga:' + cargaId + ':det' }],
      [{ text: '🗺️ Ver rota', callback_data: 'm:carga:' + cargaId + ':rota' }],
      [{ text: '⬅️ Voltar', callback_data: 'm:cargas:dia' }]
    ]
  };
}

async function telaCargaDetalhes(cargaId) {
  const carga = await cargasRepo.buscarPorId(cargaId);
  if (!carga) {
    return { texto: 'Essa carga não existe mais.', teclado: [[{ text: '⬅️ Voltar', callback_data: 'm:cargas:dia' }]] };
  }

  const texto =
    '👁️ *Detalhes da carga #' + carga.id + '*\n\n' +
    '📅 Data: ' + carga.data + '\n' +
    '📌 Status: ' + carga.status + '\n' +
    '🚚 Caminhão: ' + carga.caminhaoLabel + '\n' +
    '📦 Paradas: ' + carga.paradas.length;

  return { texto, teclado: [[{ text: '⬅️ Voltar', callback_data: 'm:carga:' + cargaId }]] };
}

function formatarParadaResumo(p, indice) {
  const icone = ICONE_STATUS_PARADA[p.status] || '⬜';
  const tipo = ICONE_TIPO[p.tipo] || '';
  return icone + ' Ponto ' + indice + ' — ' + tipo + ' ' + (p.cliente || 'cliente não identificado');
}

async function telaCargaRota(cargaId) {
  const paradas = await paradasRepo.listar({ cargaId });
  if (!paradas.length) {
    return { texto: 'Essa carga ainda não tem pontos de rota.', teclado: [[{ text: '⬅️ Voltar', callback_data: 'm:carga:' + cargaId }]] };
  }

  const texto = '🗺️ *Rota da carga #' + cargaId + '*\n\n' +
    paradas.map((p, i) => formatarParadaResumo(p, i + 1)).join('\n');

  return { texto, teclado: [[{ text: '⬅️ Voltar', callback_data: 'm:carga:' + cargaId }]] };
}

function telaRota() {
  return {
    texto: '🛣️ *Rota*',
    teclado: [
      [{ text: '📍 Gerenciar Rota', callback_data: 'm:rota:ger' }],
      [{ text: '⬅️ Voltar', callback_data: 'm:home' }]
    ]
  };
}

async function telaGerenciarRota(motoristaId) {
  const carga = await buscarCargaAtiva(motoristaId);
  if (!carga) {
    return {
      texto: '📍 *Gerenciar Rota*\n\nVocê não tem nenhuma rota em andamento agora.',
      teclado: [[{ text: '⬅️ Voltar', callback_data: 'm:rota' }]]
    };
  }

  return {
    texto: '📍 *Gerenciar Rota*\nCarga #' + carga.id + ' — ' + carga.caminhaoLabel,
    teclado: [
      [{ text: '🏁 Próximo destino', callback_data: 'm:rota:prox:' + carga.id }],
      [{ text: '📋 Pontos da rota', callback_data: 'm:rota:pontos:' + carga.id }],
      [{ text: '⚠️ Relatar Problema', callback_data: 'm:rota:problema:' + carga.id }],
      [{ text: '⬅️ Voltar', callback_data: 'm:rota' }]
    ]
  };
}

async function telaProximoDestino(cargaId) {
  const paradas = await paradasRepo.listar({ cargaId });
  const proxima = paradas.find((p) => p.status === 'pendente');

  if (!proxima) {
    return {
      texto: '🏁 *Próximo destino*\n\nNenhum ponto pendente — a rota está completa.',
      teclado: [[{ text: '⬅️ Voltar', callback_data: 'm:rota:ger' }]]
    };
  }

  const texto = '🏁 *Próximo destino*\n\n' +
    (ICONE_TIPO[proxima.tipo] || '') + ' ' + (proxima.tipo === 'coleta' ? 'Coleta' : 'Entrega') + '\n' +
    '👤 ' + (proxima.cliente || 'não identificado') + '\n' +
    '📍 ' + (proxima.endereco || 'endereço não informado');

  return { texto, teclado: [[{ text: '⬅️ Voltar', callback_data: 'm:rota:ger' }]] };
}

async function telaPontosDaRota(cargaId) {
  const paradas = await paradasRepo.listar({ cargaId });
  if (!paradas.length) {
    return { texto: 'Essa rota ainda não tem pontos.', teclado: [[{ text: '⬅️ Voltar', callback_data: 'm:rota:ger' }]] };
  }

  const linhas = paradas.map((p, i) => ([{
    text: formatarParadaResumo(p, i + 1),
    callback_data: 'm:rota:ponto:' + p.id
  }]));
  linhas.push([{ text: '⬅️ Voltar', callback_data: 'm:rota:ger' }]);

  return { texto: '📋 *Pontos da rota*', teclado: linhas };
}

async function telaPontoDetalhes(paradaId) {
  const parada = await paradasRepo.buscarPorId(paradaId);
  if (!parada) {
    return { texto: 'Esse ponto não existe mais.', teclado: [[{ text: '⬅️ Voltar', callback_data: 'm:rota:ger' }]] };
  }

  const texto =
    (ICONE_STATUS_PARADA[parada.status] || '⬜') + ' *' + (parada.tipo === 'coleta' ? 'Coleta' : 'Entrega') + '*\n\n' +
    '👤 ' + (parada.cliente || 'não identificado') + '\n' +
    '📍 ' + (parada.endereco || 'endereço não informado') +
    (parada.observacoes ? '\n📝 ' + parada.observacoes : '');

  return { texto, teclado: [[{ text: '⬅️ Voltar', callback_data: 'm:rota:pontos:' + parada.cargaId }]] };
}

function telaRelatarProblema(cargaId) {
  return {
    texto: '⚠️ *Relatar Problema*\n\nEssa função ainda está em construção — por enquanto não é possível registrar um problema por aqui.',
    teclado: [[{ text: '⬅️ Voltar', callback_data: 'm:rota:ger' }]]
  };
}

/* --------------------- roteador do callback_query --------------------- */

async function resolverTela(dado, motorista) {
  const partes = dado.split(':'); // ex: ['m','carga','12','det']

  if (dado === 'm:home') return telaPrincipal();
  if (dado === 'm:ajuda') return telaAjuda();
  if (dado === 'm:cargas') return telaCargas();
  if (dado === 'm:cargas:dia') return telaCargasDoDia(motorista.id);
  if (dado === 'm:rota') return telaRota();
  if (dado === 'm:rota:ger') return telaGerenciarRota(motorista.id);

  if (partes[1] === 'carga' && partes.length === 3) return telaCargaSelecionada(partes[2]);
  if (partes[1] === 'carga' && partes[3] === 'det') return telaCargaDetalhes(partes[2]);
  if (partes[1] === 'carga' && partes[3] === 'rota') return telaCargaRota(partes[2]);

  if (partes[1] === 'rota' && partes[2] === 'prox') return telaProximoDestino(partes[3]);
  if (partes[1] === 'rota' && partes[2] === 'pontos') return telaPontosDaRota(partes[3]);
  if (partes[1] === 'rota' && partes[2] === 'problema') return telaRelatarProblema(partes[3]);
  if (partes[1] === 'rota' && partes[2] === 'ponto') return telaPontoDetalhes(partes[3]);

  return null;
}

// Manda o menu principal pro chat, se ele for de um motorista vinculado.
// Retorna true se mandou o menu, false se não é motorista (chamador decide
// o que fazer nesse caso). Reaproveitado pelo /menu e pelo /start.
async function enviarMenuPrincipal(bot, chatId) {
  const motorista = await buscarMotoristaPorChat(chatId);
  if (!motorista) return false;

  const tela = telaPrincipal();
  await bot.sendMessage(chatId, tela.texto, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: tela.teclado } });
  return true;
}

// Registra só o roteador de callback_query (botões) do menu do motorista.
// O comando de texto /menu é centralizado em Comandos.js, que decide se
// quem digitou é motorista ou cliente e chama o enviarMenuPrincipal certo.
function registrarMenu(bot) {
  bot.on('callback_query', (query) => {
    const dado = query.data || '';
    if (!dado.startsWith('m:')) return; // não é um callback deste menu

    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;

    marcar((async () => {
      try {
        const motorista = await buscarMotoristaPorChat(chatId);
        if (!motorista) {
          await bot.answerCallbackQuery(query.id, { text: 'Vincule sua conta primeiro (/vincular <código>).', show_alert: true });
          return;
        }

        const tela = await resolverTela(dado, motorista);
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
        console.error('Erro ao navegar no menu:', err.message);
        await bot.answerCallbackQuery(query.id, { text: 'Deu um erro. Tenta de novo.', show_alert: true });
      }
    })());
  });
}

module.exports = { registrarMenu, enviarMenuPrincipal };