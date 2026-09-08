/* =========================================================
   Repositório de CARGAS
   ---------------------------------------------------------
   Traz junto o caminhão e o motorista (join), porque toda tela
   que lista cargas precisa mostrar quem está dirigindo o quê.
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

  return {
    id: row.id,
    data: row.data,
    status: row.status,
    caminhaoId: row.caminhao_placa,
    caminhaoLabel: row.caminhao_placa + (caminhao.modelo ? ' — ' + caminhao.marca + ' ' + caminhao.modelo : ''),
    capacidadeCaminhao: caminhao.capacidade_kg,
    motoristaId: row.motorista_id,
    motoristaLabel: nomeMotorista,
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

async function criar(dados) {
  const { data, error } = await supabaseService
    .from('cargas')
    .insert({ caminhao_placa: dados.caminhaoId, motorista_id: dados.motoristaId, data: dados.data, status: 'pendente' })
    .select('id')
    .single();
  if (error) throw error;

  // marca caminhão e motorista como "em_rota" (regra simples; ajuste
  // a granularidade se um dia existir mais de uma carga por dia)
  await supabaseService.from('caminhoes').update({ status: 'em_rota' }).eq('placa', dados.caminhaoId);
  await supabaseService.from('motoristas').update({ status: 'em_rota' }).eq('usuario_id', dados.motoristaId);

  return buscarPorId(data.id);
}

async function atualizarStatus(id, status) {
  const { error } = await supabaseService.from('cargas').update({ status }).eq('id', id);
  if (error) throw error;

  if (status === 'concluida') {
    const carga = await buscarPorId(id);
    if (carga) {
      await supabaseService.from('caminhoes').update({ status: 'disponivel' }).eq('placa', carga.caminhaoId);
      await supabaseService.from('motoristas').update({ status: 'disponivel' }).eq('usuario_id', carga.motoristaId);
    }
  }
  return buscarPorId(id);
}

async function excluir(id) {
  const { error } = await supabaseService.from('cargas').delete().eq('id', id);
  if (error) throw error;
}

module.exports = { listar, buscarPorId, criar, atualizarStatus, excluir };
