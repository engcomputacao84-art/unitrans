/* =========================================================
   Repositório de PARADAS
   ---------------------------------------------------------
   Usado pelo app do motorista (ver/():marcar parada concluída,
   registrar ocorrência) e pelo painel da equipe (tela de
   entregas). Marcar uma parada como "concluida" dispara o
   trigger trg_sync_status_parada do schema.sql, que já
   atualiza sozinho solicitacoes.status e cargas.status — este
   repositório NÃO duplica essa lógica, só faz o UPDATE simples.
   ========================================================= */

const { supabaseService } = require('../Banco/js/supabaseClient');

const SELECT_PARADA = `
  id, carga_id, solicitacao_id, tipo, ordem, hora_prevista, hora_realizada, status,
  solicitacoes (
    id, tipo_carga, peso_kg, observacoes,
    clientes ( tipo_pessoa, razao_social, usuarios ( nome, telefone ) ),
    coleta:enderecos!solicitacoes_endereco_coleta_id_fkey ( logradouro, numero, bairro, cidade, estado ),
    entrega:enderecos!solicitacoes_endereco_entrega_id_fkey ( logradouro, numero, bairro, cidade, estado )
  ),
  ocorrencias ( id, tipo_ocorrencia, descricao, registrado_em )
`;

function formatarEndereco(e) {
  if (!e) return '';
  return [e.logradouro, e.numero].filter(Boolean).join(', ') +
    (e.bairro ? ' — ' + e.bairro : '') +
    (e.cidade ? ' (' + e.cidade + (e.estado ? '/' + e.estado : '') + ')' : '');
}

function paraApi(row) {
  const sol = row.solicitacoes || {};
  const cliente = sol.clientes || {};
  const usuario = cliente.usuarios || {};
  const nomeCliente = cliente.tipo_pessoa === 'PJ' ? (cliente.razao_social || usuario.nome) : usuario.nome;
  const ocorrencia = Array.isArray(row.ocorrencias) ? row.ocorrencias[0] : row.ocorrencias;

  return {
    id: row.id,
    cargaId: row.carga_id,
    solicitacaoId: row.solicitacao_id,
    tipo: row.tipo, // 'coleta' | 'entrega'
    ordem: row.ordem,
    horaPrevista: row.hora_prevista,
    horaRealizada: row.hora_realizada,
    status: row.status, // 'pendente' | 'concluida' | 'ocorrencia'
    cliente: nomeCliente,
    telefoneCliente: usuario.telefone,
    endereco: row.tipo === 'coleta' ? formatarEndereco(sol.coleta) : formatarEndereco(sol.entrega),
    tipoCarga: sol.tipo_carga,
    pesoKg: sol.peso_kg,
    observacoes: sol.observacoes,
    ocorrencia: ocorrencia ? {
      tipo: ocorrencia.tipo_ocorrencia,
      descricao: ocorrencia.descricao,
      registradoEm: ocorrencia.registrado_em
    } : null
  };
}

async function listar(filtros) {
  let query = supabaseService.from('paradas').select(SELECT_PARADA).order('ordem');
  if (filtros && filtros.cargaId) query = query.eq('carga_id', filtros.cargaId);
  if (filtros && filtros.status) query = query.eq('status', filtros.status);

  const { data, error } = await query;
  if (error) throw error;
  return data.map(paraApi);
}

async function buscarPorId(id) {
  const { data, error } = await supabaseService.from('paradas').select(SELECT_PARADA).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? paraApi(data) : null;
}

// Marca a parada como concluída. O trigger do schema cuida de
// atualizar solicitacoes.status e cargas.status sozinho.
async function marcarConcluida(id) {
  const { error } = await supabaseService
    .from('paradas')
    .update({ status: 'concluida', hora_realizada: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  return buscarPorId(id);
}

// Registra um problema na parada (ex: cliente ausente, carga
// avariada). Não marca como concluída — ela some da lista de
// pendências do motorista mas fica sinalizada pra equipe.
async function registrarOcorrencia(id, tipoOcorrencia, descricao) {
  const { error: erroParada } = await supabaseService
    .from('paradas').update({ status: 'ocorrencia' }).eq('id', id);
  if (erroParada) throw erroParada;

  const { error: erroOcorrencia } = await supabaseService
    .from('ocorrencias')
    .insert({ parada_id: id, tipo_ocorrencia: tipoOcorrencia, descricao: descricao });
  if (erroOcorrencia) throw erroOcorrencia;

  return buscarPorId(id);
}

// Atualiza a posição (ordem) e/ou o horário previsto da parada.
// Usado na tela da equipe quando a rota é reordenada (arrastar/setas)
// antes de sair do estado 'pendente'.
async function atualizarOrdemHora(id, dados) {
  const patch = {};
  if (dados && dados.ordem !== undefined) patch.ordem = dados.ordem;
  if (dados && dados.horaPrevista !== undefined) patch.hora_prevista = dados.horaPrevista;
  if (Object.keys(patch).length === 0) return buscarPorId(id);

  const { error } = await supabaseService.from('paradas').update(patch).eq('id', id);
  if (error) throw error;
  return buscarPorId(id);
}

// Remove a parada da rota: apaga a linha em `paradas` e devolve a
// solicitação pro "pool" (carga_id = null, status volta pra 'aprovado')
// para que a equipe possa montá-la em outra rota depois.
async function removerDaCarga(id) {
  const parada = await buscarPorId(id);
  if (!parada) return { ok: true };

  const { error: erroParada } = await supabaseService.from('paradas').delete().eq('id', id);
  if (erroParada) throw erroParada;

  const { error: erroSolicitacao } = await supabaseService
    .from('solicitacoes')
    .update({ carga_id: null, status: 'aprovado' })
    .eq('id', parada.solicitacaoId);
  if (erroSolicitacao) throw erroSolicitacao;

  return { ok: true, cargaId: parada.cargaId, solicitacaoId: parada.solicitacaoId };
}

module.exports = {
  listar,
  buscarPorId,
  marcarConcluida,
  registrarOcorrencia,
  atualizarOrdemHora,
  removerDaCarga
};
