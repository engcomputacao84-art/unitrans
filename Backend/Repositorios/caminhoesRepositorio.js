/* =========================================================
   Repositório de CAMINHÕES
   ---------------------------------------------------------
   Tabela independente (PK = placa), sem split em usuarios —
   é o repositório mais simples de todos.
   ========================================================= */

const { supabaseService } = require('../Banco/js/supabaseClient');

function paraApi(row) {
  return {
    id: row.placa,
    renavam: row.renavam,
    marca: row.marca,
    modelo: row.modelo,
    anoFabricacao: row.ano_fabricacao,
    anoModelo: row.ano_modelo,
    tipo: row.tipo,
    capacidade: row.capacidade_kg,
    proprietario: row.proprietario,
    licenciamento: {
      situacao: row.licenciamento_situacao,
      ano: row.licenciamento_ano,
      ultimaVerificacao: row.licenciamento_ultima_verificacao
    },
    status: row.status,
    ativo: row.status !== 'manutencao' && row.status !== 'inativo',
    observacoes: row.observacoes || ''
  };
}

async function listar() {
  const { data, error } = await supabaseService.from('caminhoes').select('*').order('placa');
  if (error) throw error;
  return data.map(paraApi);
}

async function buscarPorId(placa) {
  const { data, error } = await supabaseService.from('caminhoes').select('*').eq('placa', placa).maybeSingle();
  if (error) throw error;
  return data ? paraApi(data) : null;
}

function paraLinhaDb(dados) {
  const lic = dados.licenciamento || {};
  return {
    placa: (dados.id || '').toUpperCase().trim(),
    renavam: dados.renavam,
    marca: dados.marca,
    modelo: dados.modelo,
    ano_fabricacao: dados.anoFabricacao || null,
    ano_modelo: dados.anoModelo || null,
    tipo: dados.tipo,
    capacidade_kg: dados.capacidade,
    proprietario: dados.proprietario || null,
    licenciamento_situacao: lic.situacao || 'nao_verificado',
    licenciamento_ano: lic.ano || null,
    licenciamento_ultima_verificacao: lic.ultimaVerificacao || null,
    status: dados.status || (dados.ativo === false ? 'inativo' : 'disponivel'),
    observacoes: dados.observacoes || null
  };
}

async function criar(dados) {
  const linha = paraLinhaDb(dados);
  const { error } = await supabaseService.from('caminhoes').insert(linha);
  if (error) throw error;
  return buscarPorId(linha.placa);
}

async function atualizar(placaAtual, dados) {
  const linha = paraLinhaDb(dados);
  const { error } = await supabaseService.from('caminhoes').update(linha).eq('placa', placaAtual);
  if (error) throw error;
  return buscarPorId(linha.placa);
}

async function excluir(placa) {
  const { error } = await supabaseService.from('caminhoes').delete().eq('placa', placa);
  if (error) throw error;
}

async function atualizarStatus(placa, status) {
  const { error } = await supabaseService.from('caminhoes').update({ status }).eq('placa', placa);
  if (error) throw error;
  return buscarPorId(placa);
}

module.exports = { listar, buscarPorId, criar, atualizar, excluir, atualizarStatus };
