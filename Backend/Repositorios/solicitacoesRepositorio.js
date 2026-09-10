/* =========================================================
   Repositório de SOLICITAÇÕES
   ---------------------------------------------------------
   A tabela mais "cheia de join": cliente (via usuarios) +
   endereço de coleta + endereço de entrega.
   ========================================================= */

const { supabaseService } = require('../Banco/js/supabaseClient');

const SELECT_SOLICITACAO = `
  id, data_desejo, periodo_coleta, periodo_entrega, tipo_carga,
  peso_kg, volume_m3, valor_declarado, observacoes, status,
  motivo_recusa, carga_id, criado_em, atualizado_em,
  cliente_id,
  clientes ( tipo_pessoa, documento, razao_social, usuarios ( nome, email, telefone ) ),
  coleta:enderecos!solicitacoes_endereco_coleta_id_fkey ( logradouro, numero, bairro, cidade, estado ),
  entrega:enderecos!solicitacoes_endereco_entrega_id_fkey ( logradouro, numero, bairro, cidade, estado )
`;

function formatarEndereco(e) {
  if (!e) return '';
  return [e.logradouro, e.numero].filter(Boolean).join(', ') +
    (e.bairro ? ' — ' + e.bairro : '') +
    (e.cidade ? ' (' + e.cidade + (e.estado ? '/' + e.estado : '') + ')' : '');
}

function paraApi(row) {
  const cliente = row.clientes || {};
  const usuario = cliente.usuarios || {};
  const nomeCliente = cliente.tipo_pessoa === 'PJ' ? (cliente.razao_social || usuario.nome) : usuario.nome;

  return {
    id: row.id,
    cliente: nomeCliente,
    documento: cliente.documento,
    telefone: usuario.telefone,
    email: usuario.email,
    enderecoColeta: formatarEndereco(row.coleta),
    enderecoEntrega: formatarEndereco(row.entrega),
    dataDesejo: row.data_desejo,
    periodoColeta: row.periodo_coleta,
    periodoEntrega: row.periodo_entrega,
    tipoCarga: row.tipo_carga,
    peso: row.peso_kg,
    volume: row.volume_m3,
    valorDeclarado: row.valor_declarado,
    observacoes: row.observacoes,
    status: row.status,
    motivoRecusa: row.motivo_recusa,
    cargaId: row.carga_id,
    criadoEm: row.criado_em
  };
}

async function listar(filtros) {
  let query = supabaseService.from('solicitacoes').select(SELECT_SOLICITACAO).order('id', { ascending: false });
  if (filtros && filtros.status) {
    // aceita um status só ('pendente') ou uma lista (['em_carga','em_rota']),
    // útil pra agrupar mais de um status numa mesma "aba" (ex: menu do cliente)
    query = Array.isArray(filtros.status) ? query.in('status', filtros.status) : query.eq('status', filtros.status);
  }
  if (filtros && filtros.clienteId) query = query.eq('cliente_id', filtros.clienteId);

  const { data, error } = await query;
  if (error) throw error;
  return data.map(paraApi);
}

async function buscarPorId(id) {
  const { data, error } = await supabaseService.from('solicitacoes').select(SELECT_SOLICITACAO).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? paraApi(data) : null;
}

// usado pelo painel do cliente: solicitação nova, feita por ele mesmo
async function criar(clienteId, dados) {
  const { data: coleta, error: erroColeta } = await supabaseService
    .from('enderecos').insert(dados.coleta).select('id').single();
  if (erroColeta) throw erroColeta;

  const { data: entrega, error: erroEntrega } = await supabaseService
    .from('enderecos').insert(dados.entrega).select('id').single();
  if (erroEntrega) throw erroEntrega;

  const { data, error } = await supabaseService
    .from('solicitacoes')
    .insert({
      cliente_id: clienteId,
      endereco_coleta_id: coleta.id,
      endereco_entrega_id: entrega.id,
      data_desejo: dados.dataDesejo,
      periodo_coleta: dados.periodoColeta,
      periodo_entrega: dados.periodoEntrega,
      tipo_carga: dados.tipoCarga,
      peso_kg: dados.peso,
      volume_m3: dados.volume,
      valor_declarado: dados.valorDeclarado,
      observacoes: dados.observacoes || null,
      status: 'pendente'
    })
    .select('id')
    .single();
  if (error) throw error;
  return buscarPorId(data.id);
}

async function aprovar(id, analistaId) {
  const { error } = await supabaseService
    .from('solicitacoes').update({ status: 'aprovado', analista_id: analistaId }).eq('id', id);
  if (error) throw error;
  return buscarPorId(id);
}

async function recusar(id, analistaId, motivo) {
  const { error } = await supabaseService
    .from('solicitacoes')
    .update({ status: 'recusado', analista_id: analistaId, motivo_recusa: motivo })
    .eq('id', id);
  if (error) throw error;
  return buscarPorId(id);
}

module.exports = { listar, buscarPorId, criar, aprovar, recusar };
