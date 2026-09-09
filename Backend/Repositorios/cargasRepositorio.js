/* =========================================================
   Repositório de CARGAS
   ---------------------------------------------------------
   Traz junto o caminhão e o motorista (join), porque toda tela
   que lista cargas precisa mostrar quem está dirigindo o quê.

   Ciclo de vida (ver migração 002):
     'montagem'  -> carga criada (dia + caminhão), sem motorista
                    ainda, solicitações sendo escolhidas.
     'pendente'  -> "Gerar rota": motorista definido, rota pronta
                    pra começar (é aqui que a tela de Rotas assume).
     'andamento' / 'concluida' -> avançam sozinhas via trigger
                    trg_sync_status_parada (schema.sql), conforme
                    as paradas vão sendo concluídas.
   ========================================================= */

const { supabaseService } = require('../Banco/js/supabaseClient');

const SELECT_CARGA = `
  id, data, status, criado_em, atualizado_em,
  caminhao_placa,
  motorista_id,
  caminhoes ( placa, marca, modelo, capacidade_kg ),
  motoristas ( usuario_id, usuarios ( nome ) ),
  paradas ( id, tipo, ordem, status, solicitacao_id )
`;

function paraApi(row) {
  const caminhao = row.caminhoes || {};
  const motorista = row.motoristas || {};
  const nomeMotorista = motorista.usuarios ? motorista.usuarios.nome : null;

  // uma solicitação gera 2 paradas (coleta + entrega) — pro resumo da
  // carga, o que importa pra quem monta é quantas solicitações estão
  // ali dentro, não quantas linhas de "parada" existem.
  const solicitacaoIds = Array.from(new Set((row.paradas || []).map(function (p) { return p.solicitacao_id; })));

  return {
    id: row.id,
    data: row.data,
    status: row.status,
    caminhaoId: row.caminhao_placa,
    caminhaoLabel: row.caminhao_placa + (caminhao.modelo ? ' — ' + caminhao.marca + ' ' + caminhao.modelo : ''),
    capacidadeCaminhao: caminhao.capacidade_kg,
    motoristaId: row.motorista_id,
    motoristaLabel: nomeMotorista,
    solicitacaoIds: solicitacaoIds,
    paradas: (row.paradas || []).sort(function (a, b) { return a.ordem - b.ordem; }),
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em
  };
}

async function listar(filtros) {
  let query = supabaseService.from('cargas').select(SELECT_CARGA).order('data', { ascending: false });
  if (filtros && filtros.data) query = query.eq('data', filtros.data);
  if (filtros && filtros.status) query = query.eq('status', filtros.status);
  if (filtros && filtros.motoristaId) query = query.eq('motorista_id', filtros.motoristaId);

  const { data, error } = await query;
  if (error) throw error;
  return data.map(paraApi);
}

async function buscarPorId(id) {
  const { data, error } = await supabaseService.from('cargas').select(SELECT_CARGA).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? paraApi(data) : null;
}

// Passo 1 do wizard: só dia + caminhão. Nasce em 'montagem', sem
// motorista (o DEFAULT do banco já cobre isso, mas deixamos explícito).
async function criar(dados) {
  const { data, error } = await supabaseService
    .from('cargas')
    .insert({ caminhao_placa: dados.caminhaoId, data: dados.data, status: 'montagem', motorista_id: null })
    .select('id')
    .single();
  if (error) throw error;
  return buscarPorId(data.id);
}

// Passo 1 (editar): troca o caminhão de uma carga que ainda está em
// montagem — as solicitações já escolhidas continuam as mesmas.
async function atualizarCaminhao(id, caminhaoId) {
  const { error } = await supabaseService
    .from('cargas')
    .update({ caminhao_placa: caminhaoId })
    .eq('id', id)
    .eq('status', 'montagem');
  if (error) throw error;
  return buscarPorId(id);
}

// Passo 2 do wizard: recebe a lista final de solicitações (ids) que
// devem estar nesta carga e reconcilia com o que já está gravado —
// cada solicitação vira 2 paradas (coleta + entrega). Quem sai da
// lista volta pro "pool" (carga_id = null, status 'aprovado').
async function definirItens(cargaId, solicitacaoIds) {
  const desejado = Array.from(new Set((solicitacaoIds || []).map(Number)));

  const { data: existentes, error: erroExistentes } = await supabaseService
    .from('paradas')
    .select('id, solicitacao_id, ordem')
    .eq('carga_id', cargaId);
  if (erroExistentes) throw erroExistentes;

  const atual = Array.from(new Set((existentes || []).map(function (p) { return p.solicitacao_id; })));
  const paraRemover = atual.filter(function (id) { return desejado.indexOf(id) === -1; });
  const paraAdicionar = desejado.filter(function (id) { return atual.indexOf(id) === -1; });

  if (paraRemover.length) {
    const { error: erroDelete } = await supabaseService
      .from('paradas').delete().eq('carga_id', cargaId).in('solicitacao_id', paraRemover);
    if (erroDelete) throw erroDelete;

    const { error: erroSolicitacoes } = await supabaseService
      .from('solicitacoes').update({ carga_id: null, status: 'aprovado' }).in('id', paraRemover);
    if (erroSolicitacoes) throw erroSolicitacoes;
  }

  if (paraAdicionar.length) {
    var proximaOrdem = (existentes || []).reduce(function (max, p) { return Math.max(max, p.ordem); }, 0) + 1;
    var novasParadas = [];
    paraAdicionar.forEach(function (solicitacaoId) {
      novasParadas.push({ carga_id: cargaId, solicitacao_id: solicitacaoId, tipo: 'coleta', ordem: proximaOrdem++ });
      novasParadas.push({ carga_id: cargaId, solicitacao_id: solicitacaoId, tipo: 'entrega', ordem: proximaOrdem++ });
    });

    const { error: erroInsert } = await supabaseService.from('paradas').insert(novasParadas);
    if (erroInsert) throw erroInsert;

    const { error: erroSolicitacoes } = await supabaseService
      .from('solicitacoes').update({ carga_id: cargaId, status: 'em_carga' }).in('id', paraAdicionar);
    if (erroSolicitacoes) throw erroSolicitacoes;
  }

  return buscarPorId(cargaId);
}

// "Gerar rota": define o motorista e tira a carga de 'montagem'.
// A partir daqui ela aparece na tela de Rotas (status 'pendente').
async function gerarRota(id, motoristaId) {
  const carga = await buscarPorId(id);
  if (!carga) return null;
  if (carga.status !== 'montagem') {
    const err = new Error('Esta carga já tem uma rota gerada.');
    err.code = 'CARGA_JA_TEM_ROTA';
    throw err;
  }

  const { error } = await supabaseService
    .from('cargas')
    .update({ motorista_id: motoristaId, status: 'pendente' })
    .eq('id', id)
    .eq('status', 'montagem');
  if (error) throw error;

  await supabaseService.from('caminhoes').update({ status: 'em_rota' }).eq('placa', carga.caminhaoId);
  await supabaseService.from('motoristas').update({ status: 'em_rota' }).eq('usuario_id', motoristaId);

  return buscarPorId(id);
}

async function atualizarStatus(id, status) {
  const { error } = await supabaseService.from('cargas').update({ status }).eq('id', id);
  if (error) throw error;

  if (status === 'concluida') {
    const carga = await buscarPorId(id);
    if (carga && carga.motoristaId) {
      await supabaseService.from('caminhoes').update({ status: 'disponivel' }).eq('placa', carga.caminhaoId);
      await supabaseService.from('motoristas').update({ status: 'disponivel' }).eq('usuario_id', carga.motoristaId);
    }
  }
  return buscarPorId(id);
}

// Exclui a carga inteira: as solicitações que estavam nela voltam pro
// pool (carga_id = null, status 'aprovado'); as paradas somem sozinhas
// (ON DELETE CASCADE, ver schema.sql). Se a carga já tinha motorista/
// caminhão reservados (ou seja, não estava mais em 'montagem'), libera
// os dois de volta pra 'disponivel'.
async function excluir(id) {
  const carga = await buscarPorId(id);
  if (!carga) return null;

  if (carga.solicitacaoIds.length) {
    const { error: erroSolicitacoes } = await supabaseService
      .from('solicitacoes').update({ carga_id: null, status: 'aprovado' }).in('id', carga.solicitacaoIds);
    if (erroSolicitacoes) throw erroSolicitacoes;
  }

  const { error } = await supabaseService.from('cargas').delete().eq('id', id);
  if (error) throw error;

  if (carga.status !== 'montagem') {
    await supabaseService.from('caminhoes').update({ status: 'disponivel' }).eq('placa', carga.caminhaoId);
    if (carga.motoristaId) {
      await supabaseService.from('motoristas').update({ status: 'disponivel' }).eq('usuario_id', carga.motoristaId);
    }
  }

  return carga;
}

module.exports = {
  listar,
  buscarPorId,
  criar,
  atualizarCaminhao,
  definirItens,
  gerarRota,
  atualizarStatus,
  excluir
};
